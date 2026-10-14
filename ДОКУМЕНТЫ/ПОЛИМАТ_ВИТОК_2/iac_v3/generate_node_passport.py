#!/usr/bin/env python3
"""
СИНГУЛЯР · Дверь ·28 УЗЕЛ / ·42 OMNISPEAKER-1
Скрипт автоматической генерации уникального криптографического паспорта узла (ECDSA P-256 + RSA-4096)
"""

import os
import sys
import json
import uuid
import hashlib
import argparse
from datetime import datetime, timezone, timedelta

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec, rsa, padding
from cryptography import x509
from cryptography.x509.oid import NameOID

def get_hardware_fingerprint():
    """Сбор аппаратного отпечатка устройства (MAC-адрес, CPU ID, Machine ID)."""
    components = []
    # Machine ID
    for path in ['/etc/machine-id', '/var/lib/dbus/machine-id']:
        if os.path.exists(path):
            try:
                with open(path, 'r') as f:
                    components.append(f.read().strip())
                break
            except Exception:
                pass
    # CPU info / Serial
    if os.path.exists('/proc/cpuinfo'):
        try:
            with open('/proc/cpuinfo', 'r') as f:
                for line in f:
                    if 'Serial' in line or 'Hardware' in line:
                        components.append(line.strip())
        except Exception:
            pass
    # Fallback to random UUID if no system components found
    if not components:
        components.append(str(uuid.uuid4()))
    
    raw_str = "|".join(components)
    return hashlib.sha256(raw_str.encode('utf-8')).hexdigest()

def generate_node_passport(output_dir="/etc/singulyar/passport", custom_node_id=None):
    os.makedirs(output_dir, exist_ok=True)
    
    hw_fingerprint = get_hardware_fingerprint()
    if custom_node_id:
        node_id = custom_node_id
    else:
        node_id = f"node-omni-{hw_fingerprint[:8]}"

    print(f"[+] Инициализация генерации крипто-паспорта для узла: {node_id}")
    print(f"[+] Аппаратный отпечаток (Hardware Fingerprint): {hw_fingerprint[:16]}...")

    # 1. Генерация ECDSA P-256 ключа (для Web Crypto API / CRDT / P2P Handshake)
    ecdsa_private_key = ec.generate_private_key(ec.SECP256R1())
    ecdsa_public_key = ecdsa_private_key.public_key()

    ecdsa_private_pem = ecdsa_private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    ).decode('utf-8')

    ecdsa_public_pem = ecdsa_public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    ).decode('utf-8')

    # Извлечение неструктурированных байт публичного ключа для JWK
    public_numbers = ecdsa_public_key.public_numbers()
    x_bytes = public_numbers.x.to_bytes(32, byteorder='big')
    y_bytes = public_numbers.y.to_bytes(32, byteorder='big')

    import base64
    def b64url(b):
        return base64.urlsafe_b64encode(b).decode('utf-8').rstrip('=')

    ecdsa_jwk = {
        "kty": "EC",
        "crv": "P-256",
        "x": b64url(x_bytes),
        "y": b64url(y_bytes),
        "ext": True,
        "key_ops": ["verify"]
    }

    # 2. Генерация RSA-4096 ключа (для асимметричного шифрования данных и X.509 Сертификата)
    rsa_private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=4096
    )
    rsa_public_key = rsa_private_key.public_key()

    rsa_private_pem = rsa_private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    ).decode('utf-8')

    rsa_public_pem = rsa_public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    ).decode('utf-8')

    # 3. Создание Самоподписанного X.509 Сертификата узла
    subject = issuer = x509.Name([
        x509.NameAttribute(NameOID.COMMON_NAME, f"singulyar-{node_id}"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, "SINGULYAR SUVEREIGN NETWORK"),
        x509.NameAttribute(NameOID.ORGANIZATIONAL_UNIT_NAME, "OMNISPEAKER-1 NODE"),
    ])

    cert = x509.CertificateBuilder().subject_name(
        subject
    ).issuer_name(
        issuer
    ).public_key(
        rsa_public_key
    ).serial_number(
        x509.random_serial_number()
    ).not_valid_before(
        datetime.now(timezone.utc)
    ).not_valid_after(
        datetime.now(timezone.utc) + timedelta(days=3650) # 10 лет
    ).add_extension(
        x509.BasicConstraints(ca=True, path_length=None), critical=True
    ).sign(rsa_private_key, hashes.SHA256())

    cert_pem = cert.public_bytes(serialization.Encoding.PEM).decode('utf-8')

    # 4. Формирование Паспорта Узла (Manifest JSON)
    created_at = datetime.now(timezone.utc).isoformat()
    manifest_payload = {
        "schema": "SINGULYAR_NODE_PASSPORT_V1",
        "node_id": node_id,
        "hardware_fingerprint": hw_fingerprint,
        "created_at": created_at,
        "ecdsa_public_jwk": ecdsa_jwk,
        "ecdsa_public_pem": ecdsa_public_pem,
        "rsa_public_pem": rsa_public_pem
    }

    canonical_manifest_str = json.dumps(manifest_payload, sort_keys=True)
    
    # Подписание Манифеста ключом ECDSA
    ecdsa_signature = ecdsa_private_key.sign(
        canonical_manifest_str.encode('utf-8'),
        ec.ECDSA(hashes.SHA256())
    )
    signature_hex = ecdsa_signature.hex()

    full_passport = {
        "manifest": manifest_payload,
        "ecdsa_signature_hex": signature_hex,
        "node_certificate_pem": cert_pem
    }

    # 5. Сохранение файлов на диск
    files = {
        "node_passport.json": json.dumps(full_passport, indent=2),
        "node_ecdsa_private.pem": ecdsa_private_pem,
        "node_ecdsa_public.pem": ecdsa_public_pem,
        "node_rsa_private.pem": rsa_private_pem,
        "node_rsa_public.pem": rsa_public_pem,
        "node_cert.pem": cert_pem
    }

    for fname, content in files.items():
        fpath = os.path.join(output_dir, fname)
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(content)
        # Установка жестких прав для приватных ключей
        if 'private' in fname:
            os.chmod(fpath, 0o600)
        else:
            os.chmod(fpath, 0o644)

    print(f"[SUCCESS] Паспорт узла успешно выпущен и сохранен в '{output_dir}':")
    print(f"  • ИД Узла: {node_id}")
    print(f"  • ECDSA Ключ (P-256): {output_dir}/node_ecdsa_private.pem")
    print(f"  • RSA Ключ (4096-bit): {output_dir}/node_rsa_private.pem")
    print(f"  • X.509 Сертификат: {output_dir}/node_cert.pem")
    print(f"  • JSON Паспорт: {output_dir}/node_passport.json")

    return full_passport

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="СИНГУЛЯР · Генератор Криптографических Паспортов Узлов")
    parser.add_argument("--output-dir", default="/workspace/scratch/passport", help="Директория для сохранения ключей и паспорта")
    parser.add_argument("--node-id", default=None, help="Явное задание ID узла (иначе генерируется из отпечатка)")
    args = parser.parse_args()

    generate_node_passport(output_dir=args.output_dir, custom_node_id=args.node_id)
