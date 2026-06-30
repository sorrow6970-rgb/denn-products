# DENN Products - local static dev server with NO-CACHE headers.
# Why: python -m http.server sends no Cache-Control, so Chrome heuristically
#      caches HTML on disk and serves a STALE copy without revalidating against
#      the server (survives browser restart). That made edited code fail to load
#      and, with a broken WIP build, froze the page. Sending no-cache forces the
#      browser to always refetch, so a plain reload always loads the latest code.
# Usage: python _denn-devserver.py <port> <root-dir>
import sys
import http.server
import socketserver

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
DIRECTORY = sys.argv[2] if len(sys.argv) > 2 else '.'


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


if __name__ == '__main__':
    with Server(('', PORT), NoCacheHandler) as httpd:
        print('[denn] no-cache static server on http://localhost:%d (dir=%s)' % (PORT, DIRECTORY))
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\n[denn] server stopped.')
