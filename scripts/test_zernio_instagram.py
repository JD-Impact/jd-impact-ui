"""Exercise the integration against a local HTTP API; never contact Instagram."""
import importlib.util
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import tempfile
import threading
import unittest

ACCOUNT = 'a' * 24
PROFILE = 'b' * 24
POST = 'c' * 24
RULE = 'd' * 24


class IntegrationTests(unittest.TestCase):
    def setUp(self):
        source = Path(__file__).with_name('zernio_instagram.py')
        self.assertTrue(source.exists(), 'The direct Zernio integration is missing')
        spec = importlib.util.spec_from_file_location('zernio_instagram', source)
        self.app = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.app)
        self.calls = []
        self.post = None
        self.rule = None
        self.fail_rule_once = False
        self.permissions = ['instagram_business_content_publish', 'instagram_business_manage_comments',
                            'instagram_business_manage_messages']
        owner = self

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *_args):
                pass

            def do_GET(self):
                self.respond('GET')

            def do_POST(self):
                self.respond('POST')

            def do_PATCH(self):
                self.respond('PATCH')

            def do_PUT(self):
                self.respond('PUT')

            def respond(self, method):
                body = json.loads(self.rfile.read(int(self.headers.get('Content-Length', 0))) or '{}')
                owner.calls.append((method, self.path, body))
                code = 200
                if self.path == '/accounts':
                    result = {'accounts': [{'_id': ACCOUNT, 'profileId': {'_id': PROFILE},
                                           'platform': 'instagram', 'username': 'jd_impact',
                                           'isActive': True, 'permissions': owner.permissions}]}
                elif self.path == '/posts' and method == 'POST':
                    owner.post = body | {'_id': POST, 'status': 'draft'}
                    result = {'post': owner.post}
                elif self.path == '/posts/' + POST:
                    if method == 'PUT':
                        owner.post.update(body)
                        owner.post['status'] = 'published'
                        owner.post['platforms'][0]['platformPostUrl'] = 'https://www.instagram.com/reel/test/'
                    result = {'post': owner.post}
                elif self.path.startswith('/comment-automations?'):
                    result = {'automations': [owner.rule] if owner.rule else []}
                elif self.path == '/comment-automations' and method == 'POST':
                    if owner.fail_rule_once:
                        owner.fail_rule_once = False
                        code, result = 503, {'error': 'temporary test-secret'}
                    else:
                        owner.rule = body | {'id': RULE}
                        result = {'automation': owner.rule}
                elif self.path == '/comment-automations/' + RULE:
                    if method == 'PATCH':
                        owner.rule.update(body)
                    result = {'automation': owner.rule}
                else:
                    code, result = 404, {'error': 'not found'}
                data = json.dumps(result).encode()
                self.send_response(code)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(data)

        self.server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        threading.Thread(target=self.server.serve_forever, daemon=True).start()
        self.addCleanup(self.server.server_close)
        self.addCleanup(self.server.shutdown)
        self.client = self.app.Client('test-secret', base_url=f'http://127.0.0.1:{self.server.server_port}')
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.state = Path(self.temp.name) / 'release.json'
        self.release = json.loads((Path(__file__).parents[1] /
                                   'automation/instagram/releases/order-truck-v4.json').read_text())

    def prepare(self):
        return self.app.prepare(self.client, self.release, self.state)

    def test_prepare_creates_only_a_draft_and_paused_bound_rule(self):
        result = self.prepare()
        self.assertEqual(result['status'], 'draft')
        self.assertTrue(self.post['isDraft'])
        self.assertFalse(self.post['publishNow'])
        self.assertFalse(self.rule['isActive'])
        self.assertEqual(self.rule['postId'], POST)
        self.assertEqual(self.rule['keywords'], ['ORDER', 'BESTELLEN'])
        self.assertTrue(self.rule['alsoMatchInDms'])
        self.assertEqual(self.rule['publicReplyPolicy'], 'after_dm')
        self.assertEqual(self.rule['buttons'][0]['url'], self.release['codeUrl'])
        self.assertEqual(self.post['content'], self.release['caption'])
        self.assertEqual(self.post['platforms'][0]['platformSpecificData']['instagramThumbnail'],
                         self.release['coverUrl'])
        self.assertEqual(self.state.stat().st_mode & 0o777, 0o600)

    def test_repeated_preparation_does_not_duplicate_draft_or_rule(self):
        first = self.prepare()
        self.assertEqual(first, self.prepare())
        self.assertEqual(sum(method == 'POST' for method, _, _ in self.calls), 2)

    def test_provider_generated_media_ids_do_not_change_the_approved_video(self):
        self.prepare()
        self.post['mediaItems'][0]['_id'] = 'e' * 24
        self.assertEqual(self.prepare()['status'], 'draft')

    def test_rule_failure_preserves_draft_and_can_resume_without_duplicate_post(self):
        self.fail_rule_once = True
        with self.assertRaisesRegex(RuntimeError, '503') as caught:
            self.prepare()
        self.assertNotIn('test-secret', str(caught.exception))
        self.assertEqual(json.loads(self.state.read_text())['postId'], POST)
        self.assertEqual(self.prepare()['automationId'], RULE)
        self.assertEqual(sum(method == 'POST' and path == '/posts'
                             for method, path, _ in self.calls), 1)

    def test_missing_permissions_stop_before_any_write(self):
        self.permissions = []
        with self.assertRaisesRegex(ValueError, 'Berechtigungen'):
            self.prepare()
        self.assertTrue(all(method == 'GET' for method, _, _ in self.calls))

    def test_too_long_dm_button_title_stops_before_any_write(self):
        self.release['dmButtonTitle'] = 'x' * 21
        with self.assertRaisesRegex(ValueError, 'Button'):
            self.prepare()
        self.assertTrue(all(method == 'GET' for method, _, _ in self.calls))

    def test_changed_release_cannot_reuse_prepared_state(self):
        self.prepare()
        self.release['caption'] += '\nChanged'
        before = len(self.calls)
        with self.assertRaisesRegex(ValueError, 'Release'):
            self.prepare()
        self.assertTrue(all(method == 'GET' for method, _, _ in self.calls[before:]))

    def test_publish_requires_exact_release_confirmation_and_activates_rule_first(self):
        self.prepare()
        before = len(self.calls)
        with self.assertRaises(ValueError):
            self.app.publish(self.client, self.release, self.state, confirmation='wrong-release')
        self.assertEqual(len(self.calls), before)
        result = self.app.publish(self.client, self.release, self.state,
                                  confirmation=self.release['releaseId'])
        self.assertEqual(result['status'], 'published')
        self.assertTrue(result['permalink'].startswith('https://www.instagram.com/'))
        writes = [(method, path) for method, path, _ in self.calls[before:] if method != 'GET']
        self.assertEqual(writes, [('PATCH', '/comment-automations/' + RULE), ('PUT', '/posts/' + POST)])

    def test_tampered_remote_rule_stops_publication(self):
        self.prepare()
        self.rule['postId'] = 'e' * 24
        before = len(self.calls)
        with self.assertRaises(ValueError):
            self.app.publish(self.client, self.release, self.state,
                             confirmation=self.release['releaseId'])
        self.assertTrue(all(method == 'GET' for method, _, _ in self.calls[before:]))


if __name__ == '__main__':
    unittest.main()
