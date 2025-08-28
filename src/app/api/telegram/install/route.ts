import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Guarda un secret sólo para administrar esta ruta
const ADMIN_KEY = process.env.WEBHOOK_ADMIN_KEY!;
const BOT_TOKEN = process.env.BOT_TOKEN!;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET!;
const ORIGIN = process.env.PUBLIC_WEBAPP_ORIGIN!; // p.ej. https://tu-dominio
const WEBHOOK_URL = `${ORIGIN}/api/telegram/webhook`;

type Op = 'set' | 'delete' | 'info';

async function tg<T>(method: string, body?: any): Promise<T> {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;
  const init: RequestInit = body
    ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }
    : { method: 'GET' };
  const r = await fetch(url, init);
  if (!r.ok) throw new Error(`${method} HTTP ${r.status}`);
  return (await r.json()) as T;
}

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key');
  if (!key || key !== ADMIN_KEY) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  const op = (req.nextUrl.searchParams.get('op') as Op) ?? 'set';

  try {
    if (op === 'set') {
      const res = await tg('setWebhook', {
        url: WEBHOOK_URL,
        secret_token: WEBHOOK_SECRET,
        drop_pending_updates: true,
        allowed_updates: [
          'message',
          'edited_message',
          'callback_query',
          'inline_query',
          'chat_member',
          'my_chat_member',
        ],
      });
      return NextResponse.json({ op, res });
    }

    if (op === 'delete') {
      const res = await tg('deleteWebhook', { drop_pending_updates: true });
      return NextResponse.json({ op, res });
    }

    // info
    const res = await tg('getWebhookInfo');
    return NextResponse.json({ op, res });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
