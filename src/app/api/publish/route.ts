import { NextRequest, NextResponse } from 'next/server';
import { verifyInitData } from '@/lib/telegram/verifyInitData';

export const runtime = 'nodejs';

type PublishBody = { initData: string; message: string };

export async function POST(req: NextRequest) {
  const body = (await req.json()) as PublishBody;
  if (!body?.initData || !body?.message) {
    return NextResponse.json({ ok: false, error: 'payload inválido' }, { status: 400 });
  }

  const botToken = process.env.BOT_TOKEN!;
  const ok = verifyInitData(body.initData, botToken);
  if (!ok) return NextResponse.json({ ok: false, error: 'initData inválido' }, { status: 400 });

  // Extrae start_param (firmado por Telegram dentro del initData)
  const params = new URLSearchParams(body.initData);
  const startParam = params.get('start_param');
  if (!startParam) {
    return NextResponse.json({ ok: false, error: 'Falta start_param' }, { status: 400 });
  }

  const decoded = JSON.parse(Buffer.from(startParam, 'base64').toString('utf8')) as {
    c: number; t: number; ct: string; tn?: string;
  };

  // Publicar en el MISMO tema con message_thread_id
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: decoded.c,
      message_thread_id: decoded.t,
      text: body.message,
    }),
  });
  if (!r.ok) return NextResponse.json({ ok: false, error: 'Telegram API error' }, { status: 502 });

  return NextResponse.json({ ok: true });
}
