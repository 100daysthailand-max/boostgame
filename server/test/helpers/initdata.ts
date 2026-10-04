import { signInitData } from '../../src/services/telegram.js';

export interface TestTelegramUser {
  id: number;
  username?: string;
  first_name?: string;
}

/** Builds a correctly-signed initData string for the given bot token. */
export function makeInitData(
  botToken: string,
  user: TestTelegramUser,
  authDate: number = Math.floor(Date.now() / 1000),
): string {
  return signInitData(
    { auth_date: String(authDate), user: JSON.stringify(user) },
    botToken,
  );
}
