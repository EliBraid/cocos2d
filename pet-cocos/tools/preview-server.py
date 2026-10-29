"""Quiet local preview with enough connection backlog for asset-loading browsers."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from pathlib import Path
import argparse

parser = argparse.ArgumentParser()
parser.add_argument('--port', type=int, default=8395)
parser.add_argument('--directory', type=Path, required=True)
args = parser.parse_args()

class Handler(SimpleHTTPRequestHandler):
    # the build reuses file names when assets change, so never let the browser serve stale copies
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, format, *args):
        if args and str(args[1] if len(args) > 1 else '').startswith(('4', '5')):
            super().log_message(format, *args)

class Server(ThreadingHTTPServer):
    request_queue_size = 128
    daemon_threads = True

with Server(('127.0.0.1', args.port), partial(Handler, directory=str(args.directory.resolve()))) as server:
    print(f'Preview http://127.0.0.1:{args.port}/', flush=True)
    server.serve_forever()
