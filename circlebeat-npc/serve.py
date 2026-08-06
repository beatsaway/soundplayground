"""
Circle Beat NPC local server.
Serves this folder (vendored Free NPC Maker v1.01 + animation/rig GLBs).
"""
from __future__ import annotations

import mimetypes
import os
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PORT = int(os.environ.get("PORT", "8769"))

mimetypes.add_type("text/javascript", ".js")
mimetypes.add_type("application/wasm", ".wasm")
mimetypes.add_type("model/gltf-binary", ".glb")


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        clean = self.path.split("?", 1)[0].split("#", 1)[0]
        if clean in ("/favicon.ico",) or clean.startswith("/.well-known/"):
            self.send_response(204)
            self.end_headers()
            return
        return super().do_GET()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()


def main() -> None:
    for need in ("freenpc", "animations", "rigs"):
        p = ROOT / need
        if not p.is_dir():
            print(f"Missing {p} — NPC dancer will fail until vendored assets are present.")
    httpd = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"Circle Beat NPC — http://127.0.0.1:{PORT}/")
    print("Ctrl+C to stop.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
