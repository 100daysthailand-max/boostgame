/**
 * Lấy initData của Telegram Mini App một cách chắc chắn.
 * Thứ tự thử: window.Telegram.WebApp -> hash chụp sẵn trong index.html
 * -> hash/query hiện tại -> sessionStorage do telegram-web-app.js lưu.
 */
interface TgWebApp {
  initData?: string;
  platform?: string;
  version?: string;
  ready?: () => void;
  expand?: () => void;
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TgWebApp };
    __TG_BOOT__?: { hash: string; search: string };
  }
}

function fromParams(raw: string | undefined): string {
  if (!raw) return '';
  return new URLSearchParams(raw.replace(/^[#?]/, '')).get('tgWebAppData') ?? '';
}

export function getInitData(): string {
  const fromSdk = window.Telegram?.WebApp?.initData;
  if (fromSdk) return fromSdk;

  const boot = window.__TG_BOOT__;
  const fromBoot = fromParams(boot?.hash) || fromParams(boot?.search);
  if (fromBoot) return fromBoot;

  const fromUrl = fromParams(window.location.hash) || fromParams(window.location.search);
  if (fromUrl) return fromUrl;

  try {
    const raw = sessionStorage.getItem('__telegram__initParams');
    if (raw) {
      const parsed = JSON.parse(raw) as { tgWebAppData?: string };
      if (typeof parsed.tgWebAppData === 'string' && parsed.tgWebAppData) return parsed.tgWebAppData;
    }
  } catch {
    // sessionStorage bị chặn -> bỏ qua
  }
  return '';
}

/** Đợi tối đa timeoutMs cho initData xuất hiện (script Telegram có thể tải chậm). */
export async function waitForInitData(timeoutMs = 3000): Promise<string> {
  const start = Date.now();
  for (;;) {
    const data = getInitData();
    if (data || Date.now() - start >= timeoutMs) return data;
    await new Promise((r) => setTimeout(r, 100));
  }
}

export function telegramReady(): void {
  try {
    window.Telegram?.WebApp?.ready?.();
    window.Telegram?.WebApp?.expand?.();
  } catch {
    // ngoài Telegram
  }
}

/** Dòng chẩn đoán hiển thị khi không lấy được initData (không chứa dữ liệu nhạy cảm). */
export function telegramDebugInfo(): string {
  const tg = window.Telegram?.WebApp;
  const boot = window.__TG_BOOT__;
  return [
    `sdk=${tg ? 'yes' : 'no'}`,
    `platform=${tg?.platform ?? '-'}`,
    `ver=${tg?.version ?? '-'}`,
    `initData=${tg?.initData ? tg.initData.length : 0}`,
    `hashAtLoad=${boot?.hash?.length ?? 0}`,
    `hashNow=${window.location.hash.length}`,
    `path=${window.location.pathname}`,
  ].join(' | ');
}
