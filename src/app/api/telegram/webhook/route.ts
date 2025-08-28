import { webhookCallback } from 'grammy';
import { getBot } from '@/lib/telegram/singleton';

export const runtime = 'nodejs'; // IMPORTANTE (no edge)
export const dynamic = 'force-dynamic';

const bot = getBot();
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET!;

export async function POST(req: Request) {
  // Verificar el secret_token de Telegram
  const secretToken = req.headers.get('x-telegram-bot-api-secret-token');

  if (!secretToken || secretToken !== WEBHOOK_SECRET) {
    console.log('❌ Secret token verification failed');
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // Configurar webhookCallback con opciones específicas para debugging
    const handler = webhookCallback(bot, 'std/http', {
      secretToken: WEBHOOK_SECRET, // Pasar explícitamente el secret token
    });
    const response = await handler(req);
    console.log('📤 Response status:', response.status);
    
    if (response.status === 401) {
      // Clonar la respuesta para poder leer el body sin afectar el stream original
      const clonedResponse = response.clone();
      const responseText = await clonedResponse.text();
      console.log('📄 Response body:', responseText);
    }
    
    return response;
  } catch (error) {
    console.error('❌ Error in grammy handler:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
