/**
 * СИНГУЛЯР · IndexedDB Storage Engine (v1.0 Final)
 * Резервируемое локальное хранилище с защитой Web Locks API
 */
(function(window) {
  'use strict';

  const DB_NAME = 'SingulyarDB_v1';
  const DB_VERSION = 1;

  class SingulyarStore {
    constructor() {
      this.db = null;
    }

    async init() {
      if (navigator.storage && navigator.storage.persist) {
        await navigator.storage.persist();
      }

      return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);

        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('objects')) {
            const objStore = db.createObjectStore('objects', { keyPath: 'id' });
            objStore.createIndex('state', 'delivery.state', { unique: false });
            objStore.createIndex('createdAt', 'createdAt', { unique: false });
          }
          if (!db.objectStoreNames.contains('contacts')) {
            const conStore = db.createObjectStore('contacts', { keyPath: 'id' });
            conStore.createIndex('fingerprint', 'fingerprint', { unique: false });
          }
          if (!db.objectStoreNames.contains('keys')) {
            db.createObjectStore('keys', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('audit_log')) {
            const auditStore = db.createObjectStore('audit_log', { keyPath: 'logId', autoIncrement: true });
            auditStore.createIndex('objectId', 'objectId', { unique: false });
          }
        };

        req.onsuccess = (e) => {
          this.db = e.target.result;
          resolve(this);
        };

        req.onerror = (e) => reject(e.target.error);
      });
    }

    async saveObject(obj) {
      if (navigator.locks) {
        return navigator.locks.request('singulyar_db_lock', async () => {
          return this._put('objects', obj);
        });
      }
      return this._put('objects', obj);
    }

    async getObject(id) {
      return this._get('objects', id);
    }

    async getAllObjects() {
      return this._getAll('objects');
    }

    async saveContact(contact) {
      return this._put('contacts', contact);
    }

    async getAllContacts() {
      return this._getAll('contacts');
    }

    _put(storeName, data) {
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.put(data);
        req.onsuccess = () => resolve(true);
        req.onerror = (e) => reject(e.target.error);
      });
    }

    _get(storeName, key) {
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = (e) => reject(e.target.error);
      });
    }

    _getAll(storeName) {
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = (e) => reject(e.target.error);
      });
    }
  }

  window.SingulyarStore = SingulyarStore;
})(window);
