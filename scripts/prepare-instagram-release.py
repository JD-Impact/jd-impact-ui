"""Build Make request data and workflows. This script never calls Instagram or Zernio."""
from pathlib import Path
import argparse
import hashlib
import json
import re
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
POST_TOKEN = '__DRAFT_POST_ID__'


def object_id(value):
    if not re.fullmatch(r'[a-fA-F0-9]{24}', value):
        raise ValueError('Account/Profile/Post-ID muss aus der verifizierten Zernio-Antwort stammen.')
    return value


def validate_release(release):
    if release['instagramUsername'] != 'jd_impact':
        raise ValueError('Dieses Veröffentlichungspaket gehört ausschließlich zu @jd_impact.')
    if not release['keywords'] or any(not word.strip() for word in release['keywords']):
        raise ValueError('Mindestens ein eindeutiges Stichwort ist erforderlich.')
    if len(release['caption']) > 2200 or len(release['dmMessage']) > 640:
        raise ValueError('Instagram-/DM-Text überschreitet das dokumentierte Limit.')
    if not 1 <= len(release['dmButtonTitle']) <= 20:
        raise ValueError('DM-Button benötigt einen Titel mit höchstens 20 Zeichen.')
    for field in ['videoUrl', 'coverUrl', 'codeUrl']:
        url = urlparse(release[field])
        if url.scheme != 'https' or url.hostname != 'jd-impact.github.io' or not url.path.startswith('/jd-impact-ui/'):
            raise ValueError('Für dieses Paket sind nur die eigenen öffentlichen JD-Impact-URLs vorgesehen.')
    if POST_TOKEN in json.dumps(release, ensure_ascii=False):
        raise ValueError('Der reservierte Platzhalter darf nicht im Beitragstext vorkommen.')
    for field, checksum in [('video', 'videoSha256'), ('cover', 'coverSha256')]:
        asset = ROOT / release['localAssets'][field]
        if hashlib.sha256(asset.read_bytes()).hexdigest() != release[checksum]:
            raise ValueError('Mediendatei stimmt nicht mit dem geprüften Veröffentlichungspaket überein.')


def request_data(release, account_id, profile_id):
    validate_release(release)
    draft = {
        'title': release['title'], 'content': release['caption'],
        'mediaItems': [{'type': 'video', 'url': release['videoUrl']}],
        'platforms': [{'platform': 'instagram', 'accountId': object_id(account_id),
                       'platformSpecificData': {'shareToFeed': release['shareToFeed'],
                                                'instagramThumbnail': release['coverUrl'],
                                                'commentsEnabled': True}}],
        'isDraft': True, 'publishNow': False, 'timezone': release['timezone'],
        'metadata': {'source': 'jd-impact-ui', 'releaseId': release['releaseId'], 'codeUrl': release['codeUrl']}
    }
    if release.get('firstComment'):
        draft['platforms'][0]['platformSpecificData']['firstComment'] = release['firstComment']
    automation = {
        'profileId': object_id(profile_id), 'accountId': account_id, 'postId': POST_TOKEN,
        'name': 'JD-Impact / ' + release['releaseId'], 'trigger': 'comment',
        'keywords': release['keywords'], 'matchMode': release['matchMode'],
        'dmMessage': release['dmMessage'],
        'buttons': [{'type': 'url', 'title': release['dmButtonTitle'], 'url': release['codeUrl']}],
        'commentReply': release['publicReply'], 'publicReplyPolicy': 'after_dm',
        'alsoMatchInDms': release['alsoMatchInDms'], 'repeatPolicy': release['repeatPolicy'],
        'linkTracking': release['linkTracking'], 'isActive': False
    }
    serialized = json.dumps(draft, ensure_ascii=False, sort_keys=True)
    return {'draftJson': serialized,
            'automationJson': json.dumps(automation, ensure_ascii=False),
            'idempotencyKey': 'jd-impact-' + hashlib.sha256((serialized + release['videoSha256'] + release['coverSha256']).encode()).hexdigest()}


def workflows(connection_id, team_id):
    if connection_id <= 0:
        raise ValueError('Zuerst die echte Make-Verbindungs-ID aus connection_get verwenden.')

    def api(mid, previous, method, url, body, headers=None):
        return {'id': mid, 'module': 'make-nodes-late:Universal', 'version': 1, 'follows': previous,
                'config': {'parameters': {'__IMTCONN__': connection_id},
                           'mapper': {'url': url, 'method': method, 'body': body,
                                      'headers': [{'key': 'Content-Type', 'value': 'application/json'}] + (headers or [])}}}

    def text(name):
        return {'name': name, 'type': 'text', 'required': True}

    start = {'id': 1, 'module': 'scenario-service:StartSubscenario', 'version': 2, 'root': 'main', 'config': {}}
    prepare = {
        'teamId': team_id, 'name': 'JD-Impact · Reel und Code-DM vorbereiten', 'autoActivate': False,
        'scheduling': {'type': 'on-demand'},
        'interface': {'input': [text('draftJson'), text('automationJson'), text('idempotencyKey')],
                      'output': [{'name': name, 'type': 'text'} for name in ['postId', 'automationId', 'status']]},
        'modules': [start,
                    api(2, 1, 'POST', '/posts', '{{1.draftJson}}',
                        [{'key': 'Idempotency-Key', 'value': '{{1.idempotencyKey}}'}]),
                    api(3, 2, 'POST', '/comment-automations',
                        '{{replace(1.automationJson; "__DRAFT_POST_ID__"; 2.body.post._id)}}'),
                    {'id': 4, 'module': 'scenario-service:ReturnData', 'version': 2, 'follows': 3,
                     'config': {'mapper': {'postId': '{{2.body.post._id}}',
                                           'automationId': '{{3.body.automation.id}}',
                                           'status': '{{2.body.post.status}}'}}}]
    }
    publish = {
        'teamId': team_id, 'name': 'JD-Impact · Vorbereitetes Reel veröffentlichen', 'autoActivate': False,
        'scheduling': {'type': 'on-demand'},
        'interface': {'input': [text('postId'), text('automationId')],
                      'output': [{'name': name, 'type': 'text'} for name in ['postId', 'status', 'permalink']]},
        'modules': [start,
                    api(2, 1, 'PATCH', '/comment-automations/{{1.automationId}}', '{"isActive":true}'),
                    api(3, 2, 'PUT', '/posts/{{1.postId}}', '{"isDraft":false,"publishNow":true}'),
                    {'id': 4, 'module': 'scenario-service:ReturnData', 'version': 2, 'follows': 3,
                     'config': {'mapper': {'postId': '{{3.body.post._id}}',
                                           'status': '{{3.body.post.status}}',
                                           'permalink': '{{3.body.post.platforms[1].platformPostUrl}}'}}}]
    }
    return {'prepare': prepare, 'publish': publish}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('release', type=Path)
    parser.add_argument('--account-id', required=True)
    parser.add_argument('--profile-id', required=True)
    parser.add_argument('--connection-id', type=int, required=True)
    parser.add_argument('--team-id', type=int, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    release = json.loads(args.release.read_text())
    result = {'inputs': request_data(release, args.account_id, args.profile_id),
              'workflows': workflows(args.connection_id, args.team_id)}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print('Make-Konfiguration erzeugt. Keine Verbindung aufgebaut und nichts veröffentlicht.')


if __name__ == '__main__':
    main()
