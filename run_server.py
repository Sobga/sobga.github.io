# https://developer.mozilla.org/en-US/docs/Learn/Common_questions/set_up_a_local_testing_server
# https://docs.python.org/3/library/http.server.html#module-http.server
import http.server
import socketserver
PORT = 2561



class HttpRequestHandler(http.server.SimpleHTTPRequestHandler):
    # https://gist.github.com/HaiyangXu/ec88cbdce3cdbac7b8d5
    extensions_map = {
        '': 'application/octet-stream',
        '.manifest': 'text/cache-manifest',
        '.html': 'text/html',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.svg':	'image/svg+xml',
        '.css':	'text/css',
        '.js':'text/javascript',
        '.wasm': 'application/wasm',
        '.json': 'application/json',
        '.xml': 'application/xml',
    }

    def end_headers(self) -> None:
        self.send_own_headers()
        return super().end_headers()

    def send_own_headers(self) -> None:
        #pass
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")


with socketserver.TCPServer(("", PORT), HttpRequestHandler) as httpd:
    print("serving at port", PORT)
    httpd.serve_forever()