// Caché TTL genérica por fuente. TTLs distintos porque los dominios
// cambian a ritmos distintos: BCC diario, elToque intradía.

export const TTL_BCC_MS = 24 * 60 * 60 * 1000;
export const TTL_ELTOQUE_MS = 60 * 60 * 1000;

interface Entry<T> {
  ts: number;
  value: T;
}

export class TtlCache<T> {
  private map = new Map<string, Entry<T>>();

  constructor(private ttlMs: number) {}

  get(key: string): T | null {
    const hit = this.map.get(key);
    if (!hit) return null;
    if (Date.now() - hit.ts > this.ttlMs) {
      this.map.delete(key);
      return null;
    }
    return hit.value;
  }

  set(key: string, value: T): void {
    this.map.set(key, { ts: Date.now(), value });
  }

  clear(key?: string): void {
    if (key) this.map.delete(key);
    else this.map.clear();
  }
}
