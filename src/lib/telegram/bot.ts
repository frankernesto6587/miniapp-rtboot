import { Bot, InlineKeyboard } from 'grammy';
import axios from 'axios';

const BOT_TOKEN = process.env.BOT_TOKEN!;
const BOT_USERNAME = process.env.BOT_USERNAME!;
const ORIGIN = process.env.PUBLIC_WEBAPP_ORIGIN!;
const API_URL = process.env.API_URL!;

// Empaquetar {chat_id, thread_id, chat_title} en base64url
function packStartParam(data: unknown) {
  const json = JSON.stringify(data);
  return Buffer.from(json).toString('base64url');
}

export function createBot() {
  const bot = new Bot(BOT_TOKEN);

  // /abrir dentro de un TEMA (forum topic) - DEBE IR ANTES del listener general
  bot.command('add', async (ctx) => {
    
    try {
      const msg: any = ctx.message;
    const threadId: number | undefined = msg?.message_thread_id;
    const chat = ctx.chat;

    if (!ctx.from?.id || !ctx.chat?.id || !ctx.message?.message_thread_id) {
      await ctx.reply('No tienes permisos para usar este comando.');
      return;
    }
    
    const validate = await axios.post(`${API_URL}/miniapp/validate`, {
      chat_id: ctx.chat?.id.toString(),
      thread_id: ctx.message?.message_thread_id,
      user_id: ctx.from?.id.toString(),
    });
    const validateData = validate.data;
   

    console.log('🔍 Validate data:', validateData);

    //console.log('🔍 Message:', JSON.stringify(msg, null, 2));
    
    if (!chat || typeof chat.id !== 'number' || !threadId) {
      console.log('❌ Validation failed - sending error message');
      console.log('❌ Reasons: chat exists?', !!chat, 'chat.id is number?', typeof chat?.id === 'number', 'threadId exists?', !!threadId);
      await ctx.reply('Usa /abrir dentro de un tema del grupo.');
      return;
    }

    const startParam = packStartParam(validateData.data);

    
    // Usar enlace de Telegram (requiere Mini App configurada en BotFather)
    // Remover 'bot' del final del username
    const username = BOT_USERNAME.endsWith('bot') 
      ? BOT_USERNAME.slice(0, -3) 
      : BOT_USERNAME;
    const telegramUrl = `https://t.me/${username}bot/rtminiapp?startapp=${encodeURIComponent(startParam)}`;
    

    const kb = new InlineKeyboard().url('🚀 Nuevo Deposito', telegramUrl);
    await ctx.reply('Para Agregar un nuevo deposito, abre la Mini App', { reply_markup: kb });
      
    } catch (error: any) {
      console.error('Error al abrir Mini App:', error.response.data);
      // mostrar el error en el chat de telegram con título y descripción
             await ctx.reply(
         `<b>❌ Error</b>\n\n` +
         `<i>${error.response.data.message}</i>\n\n` +
         `<b>Detalles:</b>\n` +
         error.response.data.errors.map((err: string) => `• ${err}`).join('\n'),
         { parse_mode: 'HTML' }
       );
    }

    
  });

  // Log para cualquier mensaje recibido (solo para debug, al final)
  bot.on('message', (ctx) => {
    // Solo loggear si no es un comando
    if (!ctx.message?.text?.startsWith('/')) {
      console.log('📨 Non-command message received:', ctx.message?.text);
      console.log('📨 Chat type:', ctx.chat?.type);
      console.log('📨 Message thread ID:', (ctx.message as any)?.message_thread_id);
    }
  });

  return bot;
}
