#!/usr/bin/env python3
"""
СИНГУЛЯР · Автономный локальный HTTPS-сервер для P2P-тестирования двери ·53.
Источник: блокнот владельца (14.10.2026, ответ «развернуть и запустить локальный
сервер — дай скрипт и полное руководство»); принят в дом тактом v11.29 «КОНТУР».

Зачем: WebRTC, Web Crypto и IndexedDB живут только в Secure Context —
localhost/127.0.0.1 или HTTPS на локальном IP. Скрипт сам делает временный
самоподписанный сертификат (openssl) и поднимает HTTPS на 0.0.0.0:8443.

Запуск:  python3 serve_p2p.py   (из этой папки)
Остановка: Ctrl+C.
"""
import http.server
import os
import socket
import ssl
import subprocess
import sys

PORT = 8443


def get_lan_ip():
    """Определение локального IP устройства в Wi-Fi/LAN сети."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("10.255.255.255", 1))
        ip = s.getsockname()[0]
    except Exception:
        ip = "127.0.0.1"
    finally:
        s.close()
    return ip


def generate_self_signed_cert(cert_file="cert.pem", key_file="key.pem"):
    """Генерация временного самоподписанного SSL-сертификата через OpenSSL."""
    if os.path.exists(cert_file) and os.path.exists(key_file):
        print(f"[OK] Используются существующие SSL-сертификаты: {cert_file}, {key_file}")
        return True
    print("[INFO] Генерация временного SSL-сертификата для локальной сети...")
    cmd = [
        "openssl", "req", "-x509", "-newkey", "rsa:2048",
        "-keyout", key_file, "-out", cert_file,
        "-days", "365", "-nodes", "-subj", "/CN=SingulyarLocalP2P",
    ]
    try:
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print("[OK] SSL-сертификат успешно сформирован.")
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("[WARN] OpenSSL не найден в системе.")
        return False


def run_server():
    lan_ip = get_lan_ip()
    cert_file, key_file = "cert.pem", "key.pem"
    has_ssl = generate_self_signed_cert(cert_file, key_file)
    handler = http.server.SimpleHTTPRequestHandler
    handler.extensions_map.update({
        ".html": "text/html; charset=utf-8",
        ".js": "application/javascript",
        ".json": "application/json",
        ".css": "text/css",
    })
    httpd = http.server.HTTPServer(("0.0.0.0", PORT), handler)
    if has_ssl:
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.load_cert_chain(certfile=cert_file, keyfile=key_file)
        httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
        protocol = "https"
    else:
        protocol = "http"
        print("\n[!] ВНИМАНИЕ: сервер запущен по HTTP. Для Web Crypto на смартфонах")
        print("потребуется флаг chrome://flags/#unsafely-treat-insecure-origin-as-secure\n")
    корень = os.path.dirname(os.path.abspath(__file__))
    print("\n" + "=" * 65)
    print("СИНГУЛЯР · ЛОКАЛЬНЫЙ P2P-СЕРВЕР ЗАПУЩЕН (папка скрипта: %s)" % корень)
    print("=" * 65)
    print("Дверь ·53 лежит в КОРНЕ репозитория — сервер лучше поднимать из корня репы:")
    print(f"  (cd в корень репы) && python3 ДОКУМЕНТЫ/СВЯЗЬ_ЧЕЛОВЕКА/serve_p2p.py")
    print(f"  👉 {protocol}://{lan_ip}:{PORT}/СИНГУЛЯР_53_СВЯЗЬ_ЧЕЛОВЕКА.html")
    print(f"  👉 {protocol}://{lan_ip}:{PORT}/index.html")
    print(f"  👉 {protocol}://localhost:{PORT}/СИНГУЛЯР_53_СВЯЗЬ_ЧЕЛОВЕКА.html")
    print("=" * 65)
    print("Для остановки сервера нажмите Ctrl+C\n")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[INFO] Сервер остановлен пользователем.")
        sys.exit(0)


if __name__ == "__main__":
    run_server()
