#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Radio Maria Nazareth - Program Scheduler Server & Launcher
تشغيل خادم تطبيق راديو مريم الناصرة وفتح المتصفح تلقائياً
"""

import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

def main():
    os.chdir(DIRECTORY)
    # Try preferred port 8080 or fallback to next available
    port = PORT
    server = None
    for p in range(PORT, PORT + 20):
        try:
            server = socketserver.TCPServer(("", p), Handler)
            port = p
            break
        except OSError:
            continue

    if not server:
        print("[!] تعذر حجز منفذ محلي للخادم.")
        sys.exit(1)

    url = f"http://localhost:{port}/index.html"
    print("=" * 65)
    print("  راديو مريم الناصرة - مُنشئ جدول البث الإذاعي (RMN Clock)")
    print(f"  الخادم يعمل الآن على الرابط: {url}")
    print("  يمكنك إغلاق هذه النافذة في أي وقت لإيقاف الخادم.")
    print("=" * 65)

    # Open browser automatically
    webbrowser.open(url)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nتم إيقاف الخادم بنجاح.")
        server.server_close()

if __name__ == '__main__':
    main()
