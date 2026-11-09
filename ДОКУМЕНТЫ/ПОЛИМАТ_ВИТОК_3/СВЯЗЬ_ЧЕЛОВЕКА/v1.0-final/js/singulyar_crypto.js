/**
 * СИНГУЛЯР · Web Crypto API Engine (v1.0 Final)
 * Режим E2EE шифрования: ECDH P-256 + AES-256-GCM + SHA-256 Fingerprint
 */
(function(window) {
  'use strict';

  const SingulyarCrypto = {
    async generateKeyPair() {
      const keyPair = await window.crypto.subtle.generateKey(
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        ['deriveKey', 'deriveBits']
      );
      const exportedPub = await window.crypto.subtle.exportKey('raw', keyPair.publicKey);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', exportedPub);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const fingerprint = hashArray.slice(0, 16).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(':');

      return {
        keyPair,
        publicKeyRaw: exportedPub,
        fingerprint
      };
    },

    async encryptPayload(payload, aesKey) {
      const enc = new TextEncoder();
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const encodedData = enc.encode(JSON.stringify(payload));

      const ciphertextBuffer = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        aesKey,
        encodedData
      );

      return {
        ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertextBuffer))),
        iv: btoa(String.fromCharCode(...iv)),
        algorithm: 'AES-256-GCM'
      };
    },

    async decryptPayload(encryptedObj, aesKey) {
      const dec = new TextDecoder();
      const iv = Uint8Array.from(atob(encryptedObj.iv), c => c.charCodeAt(0));
      const ciphertext = Uint8Array.from(atob(encryptedObj.ciphertext), c => c.charCodeAt(0));

      const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        aesKey,
        ciphertext
      );

      return JSON.parse(dec.decode(decryptedBuffer));
    }
  };

  window.SingulyarCrypto = SingulyarCrypto;
})(window);
