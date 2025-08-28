import { createBot } from './bot';

declare global {
  // eslint-disable-next-line no-var
  var _botInstance: ReturnType<typeof createBot> | undefined;
}

export function getBot() {
  if (!global._botInstance) {
    global._botInstance = createBot();
  }
  return global._botInstance;
}
