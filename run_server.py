# https://developer.mozilla.org/en-US/docs/Learn/Common_questions/set_up_a_local_testing_server
# https://docs.python.org/3/library/http.server.html#module-http.server
import http.server
import socketserver
PORT = 2561

Handler = http.server.SimpleHTTPRequestHandler

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print("serving at port", PORT)
    httpd.serve_forever()