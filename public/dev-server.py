import http.server
import os

class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        path = self.translate_path(self.path)
        if not os.path.isfile(path) and '.' not in os.path.basename(self.path):
            self.path = '/index.html'
        return super().do_GET()

if __name__ == '__main__':
    http.server.test(HandlerClass=SPAHandler, port=5500)
