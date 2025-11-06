declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
          };
        };
        ready: () => void;
        expand: () => void;
      };
    };
  }
}

export const isTelegramWebApp = (): boolean => {
  return !!(typeof window !== 'undefined' && window.Telegram?.WebApp?.initData);
};

export const getTelegramUser = () => {
  if (!isTelegramWebApp()) return null;
  return window.Telegram?.WebApp.initDataUnsafe.user || null;
};

export const initTelegramWebApp = () => {
  if (isTelegramWebApp()) {
    window.Telegram?.WebApp.ready();
    window.Telegram?.WebApp.expand();
  }
};

export {};
