"""
Circle Beat local server.
Serves this folder, plus Free NPC Maker src/assets for the dancer overlay.
"""
from __future__ import annotations

import mimetypes
import os
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

ROOT = Path(__file__).resolve().parent
FREENPC = (ROOT / ".." / ".." / "freenpcmaker-push").resolve()
PORT = int(os.environ.get("PORT", "8768"))

mimetypes.add_type("text/javascript", ".js")
mimetypes.add_type("application/wasm", ".wasm")
mimetypes.add_type("model/gltf-binary", ".glb")


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        clean = self.path.split("?", 1)[0].split("#", 1)[0]
        # Quiet browser chrome probes
        if clean in ("/favicon.ico",) or clean.startswith("/.well-known/"):
            self.send_response(204)
            self.end_headers()
            return
        return super().do_GET()

    def translate_path(self, path: str) -> str:
        clean = path.split("?", 1)[0].split("#", 1)[0]
        if clean.startswith("/animations/") or clean.startswith("/rigs/"):
            return str(FREENPC / "static" / clean.lstrip("/").replace("/", os.sep))
        if clean.startswith("/freenpc/"):
            rel = clean[len("/freenpc/") :]
            return str(FREENPC / "src" / rel.replace("/", os.sep))
        return super().translate_path(path)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        # Allow ESM module graph across aliased paths
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()


def main() -> None:
    if not FREENPC.is_dir():
        print(f"Missing freenpcmaker at {FREENPC}")
        print("NPC dancer needs ../../freenpcmaker-push next to soundplayground-main.")
    httpd = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"Circle Beat — http://127.0.0.1:{PORT}/")
    print(f"Free NPC src/assets → {FREENPC}")
    print("Ctrl+C to stop.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
