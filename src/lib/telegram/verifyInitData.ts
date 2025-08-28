import crypto from 'crypto';

// Verifica el initData del WebApp (HMAC con secret derivada de BOT_TOKEN)
export function verifyInitData(initData: string, botToken: string): boolean {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash') ?? '';
  params.delete('hash');

  const data: string[] = [];
  params.forEach((v, k) => data.push(`${k}=${v}`));
  data.sort();
  const dataCheckString = data.join('\n');

  const secret = crypto.createHash('sha256').update(botToken).digest(); // sha256(botToken)
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(secret).digest(); // HMAC("WebAppData", sha256(token))
  const calc = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  return calc === hash;
}
