"""Serve the existing gate and the review concept together on localhost."""

import argparse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parent.parent


class PreviewHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def translate_path(self, path):
        requested = urlsplit(path).path
        if requested == "/review":
            requested = "/review/"
        if requested.startswith("/review/"):
            base, suffix = ROOT / "review-prototype", requested[len("/review/"):]
        elif requested == "/rules" or requested.startswith("/rules/"):
            base, suffix = ROOT / "rules-page", requested[len("/rules/"):]
        else:
            base, suffix = ROOT / "review-prototype", requested.lstrip("/")
        # Reuse the standard handler's URL decoding and path traversal handling.
        self.directory = str(base)
        return super().translate_path("/" + suffix)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    server = ThreadingHTTPServer((args.host, args.port), PreviewHandler)
    display_host = "localhost" if args.host in {"127.0.0.1", "localhost"} else args.host
    print(f"Review prototype: http://{display_host}:{args.port}/review/", flush=True)
    print(f"Live review: http://{display_host}:{args.port}/?<sha,api,repo,pr>", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()
