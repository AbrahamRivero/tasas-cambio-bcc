// @ts-nocheck - runtime Cloudflare Worker, no parte del build Expo.
// Proxy elToque (Cloudflare Worker). Guarda ELTOQUE_API_KEY server-side.
// La app NUNCA llama a tasas.eltoque.com directo.
//
// Endpoints:
//   GET /trmi-daily?date=YYYY-MM-DD -> { date, rates: ElToqueRate[], fetchedAt }
//   * date default = hoy UTC. Rango interno 00:00:01 -> 23:59:01 (<24h).
//
// Env (wrangler secret, nunca en repo):
//   ELTOQUE_API_KEY = <JWT elToque>  (rotar: el token pegado en chat está comprometido)
//   CACHE_TTL_SEC = 300 (default)
//
// Deploy: wrangler secret put ELTOQUE_API_KEY ; wrangler deploy

export interface Env {
  ELTOQUE_API_KEY: string;
  CACHE_TTL_SEC?: string;
}

const ELTOQUE_HOST = 'https://tasas.eltoque.com/v1/trmi';
const ALLOW = ['USD', 'MLC', 'ECU', 'BTC', 'TRX', 'USDT_TRC20'] as const;
const CODE_OF: Record<string, string> = { USD: 'USD', MLC: 'MLC', ECU: 'EUR', BTC: 'BTC', TRX: 'TRX', USDT_TRC20: 'USDT_TRC20' };
const NAMES: Record<string, string> = {
  USD: 'Dólar',
  MLC: 'MLC',
  EUR: 'Euro',
  BTC: 'Bitcoin',
  TRX: 'Tron',
  USDT_TRC20: 'Tether',
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function todayUtc(): string {
  return new Date().toISOString().split('T')[0];
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname !== '/trmi-daily') {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }
    if (!env.ELTOQUE_API_KEY) {
      return Response.json({ error: 'Proxy sin API key' }, { status: 500 });
    }
    const date = url.searchParams.get('date') ?? todayUtc();
    if (!DATE_RE.test(date)) {
      return Response.json({ error: 'date debe ser YYYY-MM-DD' }, { status: 400 });
    }

    const cacheKey = new Request(`https://proxy/trmi-daily?date=${date}`, req);
    // @ts-expect-error Cloudflare runtime global
    const cache = typeof caches !== 'undefined' ? caches.default : null;
    if (cache) {
      const hit = await cache.match(cacheKey);
      if (hit) return hit;
    }

    const dateFrom = `${date} 00:00:01`;
    const dateTo = `${date} 23:59:01`;
    const upstream =
      `${ELTOQUE_HOST}?date_from=${encodeURIComponent(dateFrom)}` +
      `&date_to=${encodeURIComponent(dateTo)}`;

    const up = await fetch(upstream, {
      headers: { accept: '*/*', Authorization: `Bearer ${env.ELTOQUE_API_KEY}` },
    });

    if (up.status === 401 || up.status === 422) {
      // No reintentar: la key expiró o es inválida. Rotar en dashboard.
      return Response.json({ error: 'Fuente informal no disponible' }, { status: 502 });
    }
    if (up.status === 429) {
      const retry = up.headers.get('Retry-After') ?? '60';
      return Response.json(
        { error: 'Límite de la fuente informal, reintente luego' },
        { status: 429, headers: { 'Retry-After': retry } },
      );
    }
    if (!up.ok) {
      return Response.json({ error: 'Fuente informal no disponible' }, { status: 502 });
    }

    const raw = (await up.json()) as { date?: unknown; tasas?: unknown };
    if (typeof raw.date !== 'string' || !raw.tasas || typeof raw.tasas !== 'object') {
      return Response.json({ error: 'Respuesta inesperada de la fuente' }, { status: 502 });
    }
    // OJO: el upstream responde `date: hoy` aunque se pida otro día;
    // la fecha válida es la pedida.
    const tasas = raw.tasas as Record<string, unknown>;
    const fetchedAt = new Date().toISOString();
    const rates = [];
    for (const rawKey of ALLOW) {
      const v = tasas[rawKey];
      if (!isFiniteNumber(v) || v <= 0) continue;
      const code = CODE_OF[rawKey];
      rates.push({ code, name: NAMES[code], value: v, source: 'ELTOQUE', date, fetchedAt });
    }
    if (rates.length === 0) {
      return Response.json({ error: 'Sin tasas informales para esa fecha' }, { status: 502 });
    }

    const body = Response.json({ date, rates, fetchedAt });
    const ttl = Number(env.CACHE_TTL_SEC ?? '300');
    body.headers.set('Cache-Control', `public, max-age=${Number.isFinite(ttl) ? ttl : 300}`);
    if (cache) ctx.waitUntil(cache.put(cacheKey, body.clone()));
    return body;
  },
};
