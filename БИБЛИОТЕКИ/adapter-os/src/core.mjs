export const STATUS = Object.freeze({
  READY: 'READY',
  UNAVAILABLE: 'UNAVAILABLE',
  PERMISSION_REQUIRED: 'PERMISSION_REQUIRED',
  BROWSER_DEPENDENT: 'BROWSER_DEPENDENT',
  EXPERIMENTAL: 'EXPERIMENTAL',
  UNKNOWN: 'UNKNOWN'
});

export class CapabilityModel {
  constructor(seed = {}) {
    this.capabilities = structuredClone(seed.capabilities || {});
    this.preferences = structuredClone(seed.preferences || {});
    this.context = structuredClone(seed.context || {});
  }
  setCapability(path, value) { setPath(this.capabilities, path, value); }
  setPreference(path, value) { setPath(this.preferences, path, value); }
  getCapability(path, fallback = undefined) { return getPath(this.capabilities, path, fallback); }
  getPreference(path, fallback = undefined) { return getPath(this.preferences, path, fallback); }
  snapshot() { return structuredClone({ capabilities: this.capabilities, preferences: this.preferences, context: this.context }); }
}

export class AdapterRegistry {
  constructor() { this.items = new Map(); }
  register(adapter) {
    if (!adapter?.id || typeof adapter.status !== 'function') throw new TypeError('Invalid adapter contract');
    this.items.set(adapter.id, adapter);
    return adapter;
  }
  get(id) { return this.items.get(id); }
  all() { return [...this.items.values()]; }
  statuses() { return this.all().map(a => ({ id: a.id, kind: a.kind, ...a.status() })); }
}

export class MeaningRouter {
  constructor({ capabilities, registry }) { this.capabilities = capabilities; this.registry = registry; }

  route(message, { direction = 'output', preferred = [] } = {}) {
    const candidates = this.registry.all().filter(a => a.kind === direction);
    const explicit = new Set(preferred);
    const ranked = [...candidates].sort((a, b) => score(b) - score(a));
    const usable = ranked.filter(a => {
      const s = a.status();
      return s.state === STATUS.READY && (!a.canUse || a.canUse(message, this.capabilities));
    });
    const selected = usable.find(a => explicit.has(a.id)) || usable[0] || null;
    return {
      message,
      selected: selected?.id || null,
      candidates: ranked.map(a => ({ id: a.id, state: a.status().state }))
    };
  }
}

function score(adapter) { return Number(adapter.priority ?? 0); }
function setPath(obj, path, value) { const parts = path.split('.'); let cur = obj; for (let i=0;i<parts.length-1;i++) cur = cur[parts[i]] ||= {}; cur[parts.at(-1)] = value; }
function getPath(obj, path, fallback) { return path.split('.').reduce((v,k) => v == null ? undefined : v[k], obj) ?? fallback; }
