export const STATUS = Object.freeze({
  READY: 'READY',
  UNAVAILABLE: 'UNAVAILABLE',
  PERMISSION_REQUIRED: 'PERMISSION_REQUIRED',
  BROWSER_DEPENDENT: 'BROWSER_DEPENDENT',
  EXPERIMENTAL: 'EXPERIMENTAL',
  UNKNOWN: 'UNKNOWN'
});

function deepClone(v) { return JSON.parse(JSON.stringify(v)); }

export class CapabilityModel {
  constructor(seed = {}) {
    this.capabilities = deepClone(seed.capabilities || {});
    this.preferences = deepClone(seed.preferences || {});
    this.context = deepClone(seed.context || {});
  }
  setCapability(path, value) { setPath(this.capabilities, path, value); }
  setPreference(path, value) { setPath(this.preferences, path, value); }
  getCapability(path, fallback = undefined) { return getPath(this.capabilities, path, fallback); }
  getPreference(path, fallback = undefined) { return getPath(this.preferences, path, fallback); }
  snapshot() { return deepClone({ capabilities: this.capabilities, preferences: this.preferences, context: this.context }); }
}

export class AdapterRegistry {
  constructor() { this.items = new Map(); }
  register(adapter) {
    if (!adapter || !adapter.id || typeof adapter.status !== 'function') throw new TypeError('Invalid adapter contract');
    this.items.set(adapter.id, adapter);
    return adapter;
  }
  get(id) { return this.items.get(id); }
  all() { return [...this.items.values()]; }
  statuses() { return this.all().map(a => ({ id: a.id, kind: a.kind, ...a.status() })); }
}

export class MeaningRouter {
  constructor({ capabilities, registry }) { this.capabilities = capabilities; this.registry = registry; }

  /* Срез 6 «СВОД»: смешение кандидатов на один смысл. Политика выбора —
     предпочтение человека (preferred, правило ·19) выше автоматики; среди
     остального: capability-full (canUse объявлен и вернул истину) >
     приоритет (больше) > стабильный tiebreak — лексикографически по id
     (возрастание). Сортировка тотальная → выбор детерминирован при
     одинаковых входах и не зависит от порядка регистрации. canUse зовётся
     ровно один раз на адаптера. Форма ответа прежняя
     (message/selected/candidates); поле match в candidates — добавочное
     (0 — generic, 1 — полное совпадение). */
  route(message, { direction = 'output', preferred = [] } = {}) {
    const caps = this.capabilities;
    const scored = this.registry.all()
      .filter(a => a.kind === direction)
      .map(a => {
        const match = (typeof a.canUse === 'function' && a.canUse(message, caps)) ? 1 : 0;
        return { a, match };
      });
    const explicit = new Set(preferred);
    scored.sort((x, y) =>
      y.match - x.match ||
      score(y.a) - score(x.a) ||
      (x.a.id < y.a.id ? -1 : x.a.id > y.a.id ? 1 : 0));
    const usable = scored.filter(x => {
      const s = x.a.status();
      return s.state === STATUS.READY && (!x.a.canUse || x.match === 1);
    }).map(x => x.a);
    const selected = usable.find(a => explicit.has(a.id)) || usable[0] || null;
    return {
      message,
      selected: (selected && selected.id) || null,
      candidates: scored.map(x => ({ id: x.a.id, state: x.a.status().state, match: x.match }))
    };
  }
}

function score(adapter) { return Number(adapter.priority != null ? adapter.priority : 0); }
function setPath(obj, path, value) { const parts = path.split('.'); let cur = obj; for (let i=0;i<parts.length-1;i++) { if (cur[parts[i]] == null) cur[parts[i]] = {}; cur = cur[parts[i]]; } cur[parts[parts.length-1]] = value; }
function getPath(obj, path, fallback) { const v = path.split('.').reduce((x,k) => x == null ? undefined : x[k], obj); return v != null ? v : fallback; }
