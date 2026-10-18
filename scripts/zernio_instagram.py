"""Prepare and publish JD-Impact Reels through the server-side Zernio REST API."""
import argparse
from contextlib import contextmanager
import fcntl
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('release_data', ROOT / 'scripts/prepare-instagram-release.py')
release_data = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release_data)
PERMISSIONS = {'instagram_business_content_publish', 'instagram_business_manage_comments',
               'instagram_business_manage_messages'}


class Client:
    def __init__(self, api_key, base_url='https://zernio.com/api/v1'):
        if not api_key or '\n' in api_key or '\r' in api_key:
            raise ValueError('ZERNIO_API_KEY fehlt oder ist ungültig.')
        self._key = api_key
        self._base = base_url.rstrip('/')

    def request(self, method, path, body=None, idempotency_key=None):
        if not path.startswith('/') or path.startswith('//'):
            raise ValueError('Nur relative Zernio-Endpunkte erlaubt.')
        headers = {'Authorization': 'Bearer ' + self._key, 'Content-Type': 'application/json'}
        if idempotency_key:
            headers['Idempotency-Key'] = idempotency_key
        request = urllib.request.Request(self._base + path, method=method, headers=headers,
                                         data=json.dumps(body, ensure_ascii=False).encode() if body is not None else None)
        try:
            with urllib.request.urlopen(request, timeout=90) as response:
                result = json.load(response)
            if not isinstance(result, dict):
                raise RuntimeError('Zernio lieferte eine unerwartete Antwort.')
            return result
        except urllib.error.HTTPError as error:
            # Never echo arbitrary provider text: it may contain credentials or private data.
            code = error.code
            error.close()
            raise RuntimeError(f'Zernio HTTP {code} bei {method} {path.split("?")[0]}. '
                               'Status prüfen, bevor ein Schreibaufruf wiederholt wird.') from None
        except (urllib.error.URLError, TimeoutError):
            raise RuntimeError('Zernio nicht erreichbar; Ausgang möglicherweise unklar. '
                               'Vorhandenen Status prüfen, nicht erneut veröffentlichen.') from None


def identifier(value):
    return value.get('_id', value.get('id')) if isinstance(value, dict) else value


def select_account(client, username):
    accounts = client.request('GET', '/accounts').get('accounts', [])
    matches = [a for a in accounts if a.get('platform') == 'instagram' and
               a.get('username', '').lstrip('@').casefold() == username.lstrip('@').casefold()]
    if len(matches) != 1 or not matches[0].get('isActive'):
        raise ValueError('Instagram-Zielkonto fehlt, ist mehrdeutig oder nicht aktiv.')
    account = matches[0]
    if not PERMISSIONS.issubset(set(account.get('permissions', []))):
        raise ValueError('Berechtigungen für Veröffentlichung, Kommentare oder Nachrichten fehlen.')
    return {'accountId': release_data.object_id(identifier(account)),
            'profileId': release_data.object_id(identifier(account.get('profileId'))),
            'username': account['username'], 'permissions': sorted(account['permissions'])}


def expected(release, account):
    data = release_data.request_data(release, account['accountId'], account['profileId'])
    fingerprint = hashlib.sha256((data['draftJson'] + data['automationJson']).encode()).hexdigest()
    return data, fingerprint


def save_state(path, state):
    path = Path(path).resolve()
    if path.is_relative_to(ROOT):
        raise ValueError('Privaten Veröffentlichungsstatus außerhalb des Repositories speichern.')
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix('.tmp')
    fd = os.open(temp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    os.fchmod(fd, 0o600)
    with os.fdopen(fd, 'w') as out:
        json.dump(state, out, ensure_ascii=False, indent=2)
        out.write('\n')
    temp.replace(path)


def load_state(path, fingerprint):
    state = json.loads(Path(path).read_text()) if Path(path).exists() else {}
    if state and state.get('fingerprint') != fingerprint:
        raise ValueError('Release wurde verändert; eigenen Veröffentlichungsstatus verwenden.')
    return state


def check_post(post, draft):
    for key in ['title', 'content']:
        if post.get(key) != draft[key]:
            raise ValueError('Zernio-Entwurf stimmt nicht mit dem geprüften Release überein: ' + key)
    media = [{k: v for k, v in item.items() if k != '_id'} for item in post.get('mediaItems', [])]
    if media != draft['mediaItems']:
        raise ValueError('Zernio-Entwurf enthält andere Medien als das geprüfte Release.')
    platforms = post.get('platforms', [])
    if len(platforms) != 1 or platforms[0].get('platform') != 'instagram' or \
            identifier(platforms[0].get('accountId')) != draft['platforms'][0]['accountId']:
        raise ValueError('Zernio-Entwurf gehört nicht zum vorgesehenen Instagram-Konto.')
    actual = platforms[0].get('platformSpecificData', {})
    if any(actual.get(k) != v for k, v in draft['platforms'][0]['platformSpecificData'].items()):
        raise ValueError('Cover oder Reel-Einstellungen stimmen nicht mit dem Release überein.')


def check_rule(rule, expected_rule):
    # profileId is not returned by every automation response; accountId binds its owner.
    for key, value in expected_rule.items():
        if key not in ['profileId', 'isActive'] and rule.get(key) != value:
            raise ValueError('DM-Regel stimmt nicht mit dem Release überein: ' + key)


def inspect(client, state, data):
    post = client.request('GET', '/posts/' + release_data.object_id(state['postId']))['post']
    check_post(post, json.loads(data['draftJson']))
    rule = client.request('GET', '/comment-automations/' + release_data.object_id(state['automationId']))['automation']
    wanted = json.loads(data['automationJson'].replace(release_data.POST_TOKEN, state['postId']))
    check_rule(rule, wanted)
    return post, rule


def summary(state, post, rule):
    platform = post.get('platforms', [{}])[0]
    return {**state, 'status': post['status'], 'automationActive': rule['isActive'],
            'permalink': platform.get('platformPostUrl')}


def prepare(client, release, state_path):
    account = select_account(client, release['instagramUsername'])
    data, fingerprint = expected(release, account)
    state = load_state(state_path, fingerprint)
    if not state:
        draft = client.request('POST', '/posts', json.loads(data['draftJson']), data['idempotencyKey'])['post']
        state = {'releaseId': release['releaseId'], 'fingerprint': fingerprint,
                 'accountId': account['accountId'], 'profileId': account['profileId'],
                 'postId': release_data.object_id(draft['_id'])}
        save_state(state_path, state)  # Preserve the draft even if creating its rule fails.
    post = client.request('GET', '/posts/' + state['postId'])['post']
    check_post(post, json.loads(data['draftJson']))
    if post.get('status') != 'draft':
        raise ValueError('Vorhandener Beitrag ist kein Entwurf mehr; Status prüfen.')
    wanted = json.loads(data['automationJson'].replace(release_data.POST_TOKEN, state['postId']))
    if not state.get('automationId'):
        # Recover a successful-but-disconnected rule creation before creating another one.
        rules = client.request('GET', '/comment-automations?' +
                               urllib.parse.urlencode({'profileId': account['profileId']})).get('automations', [])
        matches = [r for r in rules if r.get('name') == wanted['name'] and r.get('postId') == state['postId']]
        if len(matches) > 1:
            raise ValueError('Mehrere DM-Regeln gefunden; zuerst bestehende Regeln prüfen.')
        rule = matches[0] if matches else client.request('POST', '/comment-automations', wanted)['automation']
        state['automationId'] = release_data.object_id(identifier(rule))
        save_state(state_path, state)
    post, rule = inspect(client, state, data)
    if rule.get('isActive') is not False:
        raise ValueError('Die Entwurfsregel ist bereits aktiv; Status prüfen.')
    result = summary(state, post, rule)
    save_state(state_path, result)
    return result


def status(client, release, state_path):
    data, fingerprint = expected(release, select_account(client, release['instagramUsername']))
    state = load_state(state_path, fingerprint)
    if not state.get('automationId'):
        raise ValueError('Vorbereitung unvollständig; prepare mit demselben Release fortsetzen.')
    post, rule = inspect(client, state, data)
    result = summary(state, post, rule)
    save_state(state_path, result)
    return result


def publish(client, release, state_path, confirmation):
    if confirmation != release['releaseId']:
        raise ValueError('Veröffentlichen benötigt --confirm-publish mit der exakten Release-ID.')
    data, fingerprint = expected(release, select_account(client, release['instagramUsername']))
    state = load_state(state_path, fingerprint)
    post, rule = inspect(client, state, data)
    if post['status'] != 'draft':
        return status(client, release, state_path)  # Never retry a publishing/published post.
    rule = client.request('PATCH', '/comment-automations/' + state['automationId'], {'isActive': True})['automation']
    if rule.get('isActive') is not True:
        raise ValueError('DM-Regel nicht aktiv; Veröffentlichung gestoppt.')
    client.request('PUT', '/posts/' + state['postId'], {'isDraft': False, 'publishNow': True})
    return status(client, release, state_path)


@contextmanager
def release_lock(path):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd = os.open(path, os.O_RDWR | os.O_CREAT, 0o600)
    with os.fdopen(fd, 'w') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise ValueError('Dieses Release wird gerade bereits verarbeitet.') from None
        yield


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['accounts', 'prepare', 'status', 'publish'])
    parser.add_argument('--release', type=Path, default=ROOT / 'automation/instagram/releases/order-truck-v4.json')
    parser.add_argument('--state-dir', type=Path, default=ROOT.parent / 'jd-instagram-setup')
    parser.add_argument('--api-key-file', type=Path, help='Private Datei außerhalb des Repositories; alternativ ZERNIO_API_KEY.')
    parser.add_argument('--confirm-publish')
    args = parser.parse_args()
    try:
        if args.api_key_file and args.api_key_file.resolve().is_relative_to(ROOT):
            raise ValueError('API-Schlüssel außerhalb des Repositories speichern.')
        key = args.api_key_file.read_text().strip() if args.api_key_file else os.environ.get('ZERNIO_API_KEY', '')
        client = Client(key)
        release = json.loads(args.release.read_text())
        if not re.fullmatch(r'[a-zA-Z0-9_-]+', release['releaseId']):
            raise ValueError('Ungültige Release-ID.')
        if args.command == 'accounts':
            result = select_account(client, release['instagramUsername'])
        else:
            if args.state_dir.resolve().is_relative_to(ROOT):
                raise ValueError('Privaten Veröffentlichungsstatus außerhalb des Repositories speichern.')
            state_path = args.state_dir / (release['releaseId'] + '.state.json')
            with release_lock(state_path.with_suffix('.lock')):
                if args.command == 'publish':
                    result = publish(client, release, state_path, args.confirm_publish)
                else:
                    result = globals()[args.command](client, release, state_path)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        if args.command == 'publish' and (result['status'] != 'published' or not result['permalink']):
            return 2  # Pending/failed is never reported as completed publication.
        return 0
    except (ValueError, RuntimeError, OSError, KeyError) as error:
        print(str(error), file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
