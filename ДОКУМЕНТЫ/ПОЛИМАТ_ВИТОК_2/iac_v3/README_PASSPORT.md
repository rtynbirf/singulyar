# СИНГУЛЯР · Паспорт Физического Узла (Node Cryptographic Passport)

Каждый прошитый микрокомпьютер или плата **OMNISPEAKER-1** при первичной загрузке или прошивке генерирует уникальный криптографический паспорт.

## Состав Паспорта (`/etc/singulyar/passport/`):
1. **`node_ecdsa_private.pem` & `node_ecdsa_public.pem`**:
   Ключевая пара **ECDSA P-256 (secp256r1)**. Используется для сверхбыстрого подписания транзакций кошелька (`·25 КОШЕЛЁК`), блоков фонда (`·33 ФОНД`) и бессерверных P2P-пакетов WebRTC (`·22 СВЯЗЬ`).
2. **`node_rsa_private.pem` & `node_rsa_public.pem`**:
   Асимметричная пара **RSA 4096-bit** для стойкого шифрования автономных архивов и P2P-сообщений.
3. **`node_cert.pem`**:
   Самоподписанный **X.509 Сертификат** (срок действия 10 лет) с привязкой к уникальному ID узла.
4. **`node_passport.json`**:
   Канонический манифест с аппаратным отпечатком (Hardware Fingerprint), публичными JWK-ключами и подписью ECDSA.

## Импорт в Web Crypto API (Браузерный Рантайм):
Браузер считывает `/assets/node_passport.json` и мгновенно импортирует `ecdsa_public_jwk`:
```javascript
const ecdsaPublicKey = await window.crypto.subtle.importKey(
    "jwk",
    passport.manifest.ecdsa_public_jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["verify"]
);
```
