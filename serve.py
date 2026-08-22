#!/usr/bin/env python3
"""Dev server for mica: http.server with caching disabled."""
import http.server

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        # GitHub Pages publishes this project under /mica/. Mirror that base
        # path for portal review while retaining root URLs for local probes.
        if path == "/mica" or path.startswith("/mica/"):
            path = path[5:] or "/"
        return super().translate_path(path)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Expires", "0")
        super().end_headers()

if __name__ == "__main__":
    http.server.test(HandlerClass=NoCacheHandler, port=8471)
