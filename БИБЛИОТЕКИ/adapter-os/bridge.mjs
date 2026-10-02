/* ═══════════════════════════════════════════════════════════════════════
   SINGULYAR ADAPTER OS · МОСТ v0.1
   Слой поверх ·19 ЧЕЛОВЕК / ·21 ОБЩЕНИЕ / ·22 СВЯЗЬ.
   Ядра страниц НЕ тронуты: мост регистрирует их проверенные механизмы
   как адаптеры, ведёт шину смыслов и даёт честные статусы.

   Принцип (наследует ·19/·21/·22):
     ЧЕЛОВЕК → ПРЕДПОЧТЕНИЯ → ВОЗМОЖНОСТИ → СМЫСЛ → АДАПТЕР → ПРЕДСТАВЛЕНИЕ

   Честные границы v0.1 (не притворяемся больше, чем сделано):
   — production-проводка ·21/·22 на реестр — СЛЕДУЮЩИЙ срез (их правило №10:
     сначала тесты против живых файлов, потом проводка);
   — OCR/Whisper/Gaze/Braille/Demucs — контракты EXPERIMENTAL, моделей нет;
   — на file:// module-import блокируется браузером → страницы работают
     как раньше, OS честно сообщает state:'unavailable'.

   0 innerHTML · 0 сети · 0 телеметрии · ядро из архива не изменено
   ═══════════════════════════════════════════════════════════════════════ */

const BUS_KEY = 'singulyar.meaningbus.v1';
const BUS_CHANNEL = 'singular-meaning-bus-v1';
const BUS_MAX = 50;

function читатьЛогШины() {
    try {
        const x = JSON.parse(localStorage.getItem(BUS_KEY) || '[]');
        return Array.isArray(x) ? x : [];
    } catch (e) { return []; }
}
function писатьЛогШины(лог) {
    try { localStorage.setItem(BUS_KEY, JSON.stringify(лог.slice(-BUS_MAX))); } catch (e) { /* приватный режим — лог только в памяти */ }
}
function новыйId() {
    try { return crypto.randomUUID(); } catch (e) { return 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2); }
}

/* Шина смыслов: конверты {id, type, payload, createdAt, author}.
   Транспорт — BroadcastChannel одного браузера + зеркало в localStorage.
   Мост ·21⇄·22 (singular-most-21-22-v1) остаётся как был — шина отдельная
   и на их логику не влияет. */
function сделатьШину(author) {
    const подписчики = new Set();
    let чан = null;
    try { чан = (typeof BroadcastChannel !== 'undefined') ? new BroadcastChannel(BUS_CHANNEL) : null; } catch (e) { чан = null; }
    if (чан) чан.onmessage = function (ev) {
        const env = ev && ev.data;
        if (!env || !env.id) return;
        подписчики.forEach(function (fn) { try { fn(env, 'channel'); } catch (e) {} });
    };
    return {
        transport: чан ? 'broadcastchannel+localstorage' : 'localstorage',
        log: читатьЛогШины,
        publish: function (type, payload) {
            const env = { id: новыйId(), type: String(type || 'meaning'), payload: payload == null ? null : payload, createdAt: new Date().toISOString(), author: author };
            const лог = читатьЛогШины(); лог.push(env); писатьЛогШины(лог);
            if (чан) try { чан.postMessage(env); } catch (e) { /* structured clone не взял — в зеркале всё равно есть */ }
            return env;
        },
        subscribe: function (fn) {
            подписчики.add(fn);
            return function () { подписчики.delete(fn); };
        }
    };
}

/* Датчики устройства — только проверяемые факты, ничего не включаем сами */
function датчики() {
    return {
        display: true,
        speechSynthesis: ('speechSynthesis' in globalThis),
        vibration: ('vibrate' in navigator),
        speechRecognition: !!(globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition),
        camera: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
        microphone: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
        broadcastChannel: (typeof BroadcastChannel !== 'undefined'),
        indexedDB: ('indexedDB' in globalThis)
    };
}

export async function bootAdapterOS(opts) {
    opts = opts || {};
    const core = await import('./src/core.mjs');
    const basic = await import('./adapters/basic.mjs');
    const contracts = await import('./adapters/contracts.mjs');
    const store = await import('./src/store.mjs');

    const author = String(opts.page || 'unknown');

    /* Предпочтения человека — выше автоматики (правило ·19): страницы
       отдают свои сохранённые предпочтения, мост их не придумывает. */
    const capabilities = new core.CapabilityModel({ preferences: opts.preferences || {} });
    const дат = датчики();
    Object.keys(дат).forEach(function (k) { capabilities.setCapability(k, дат[k]); });

    const registry = new core.AdapterRegistry();
    basic.browserAdapters.forEach(function (a) { registry.register(a); });
    contracts.allOptionalContracts.forEach(function (a) { registry.register(a); });
    (opts.adapters || []).forEach(function (a) { registry.register(a); });

    const router = new core.MeaningRouter({ capabilities: capabilities, registry: registry });
    const bus = сделатьШину(author);

    /* Хранилище — честное: IndexedDB + явный JSON-экспорт, без слова «вечный» */
    const хранилище = {
        async save(key, value) { return store.put(key, value); },
        async load(key) { return store.get(key); },
        async exportJson(key) { return store.exportRecord(key); }
    };

    const os = {
        version: '0.1',
        page: author,
        state: 'ready',
        STATUS: core.STATUS,
        capabilities: capabilities,
        registry: registry,
        router: router,
        bus: bus,
        store: хранилище,
        registerAdapter: function (a) { registry.register(a); return a; },
        routeOut: function (meaning, preferred) {
            return router.route(meaning, { direction: 'output', preferred: preferred || [] });
        },
        statuses: function () { return registry.statuses(); }
    };

    if (opts.expose !== false) {
        try { Object.defineProperty(window, 'SingulyarOS', { value: os, configurable: true, writable: false }); }
        catch (e) { try { window.SingulyarOS = os; } catch (e2) { /* последнее средство — молча */ } }
    }
    return os;
}
