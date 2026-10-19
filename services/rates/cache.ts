// Caché TTL genérica por fuente. TTLs distintos porque los dominios
// cambian a ritmos distintos: BCC diario, elToque intradía.

export const TTL_BCC_MS = 24 * 60 * 60 * 1000;
export const TTL_ELTOQUE_MS = 60 * 60 * 1000;
// La vista "tiempo real" del widget es un valor vivo: se refresca más seguido
// que el publicado (que ya está cerrado hasta la próxima ventana de las 07:00).
export const TTL_ELTOQUE_REALTIME_MS = 5 * 60 * 1000;

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
