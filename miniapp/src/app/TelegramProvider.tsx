"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface TelegramThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
}

interface TelegramWebApp {
  ready: () => void;
  initDataUnsafe?: {
    user?: TelegramUser;
  };
  themeParams?: TelegramThemeParams;
  initData?: string;
}

interface TelegramContextType {
  isInTelegram: boolean;
  telegramUser: TelegramUser | null;
  themeParams: TelegramThemeParams | null;
  initData: string | null;
}

const TelegramContext = createContext<TelegramContextType>({
  isInTelegram: false,
  telegramUser: null,
  themeParams: null,
  initData: null,
});

export const useTelegram = () => useContext(TelegramContext);

interface TelegramProviderProps {
  children: ReactNode;
}

export default function TelegramProvider({ children }: TelegramProviderProps) {
  const [contextValue, setContextValue] = useState<TelegramContextType>({
    isInTelegram: false,
    telegramUser: null,
    themeParams: null,
    initData: null,
  });

  useEffect(() => {
    const initTelegram = () => {
      const telegram = (window as any).Telegram;
      if (telegram?.WebApp) {
        const WebApp: TelegramWebApp = telegram.WebApp;
        WebApp.ready();

        const user = WebApp.initDataUnsafe?.user || null;
        const themeParams = WebApp.themeParams || null;
        const initData = WebApp.initData || null;

        setContextValue({
          isInTelegram: true,
          telegramUser: user,
          themeParams: themeParams,
          initData: initData,
        });

        if (themeParams) {
          const root = document.documentElement;
          if (themeParams.bg_color) root.style.setProperty("--tg-bg-color", themeParams.bg_color);
          if (themeParams.text_color) root.style.setProperty("--tg-text-color", themeParams.text_color);
          if (themeParams.button_color) root.style.setProperty("--tg-button-color", themeParams.button_color);
          if (themeParams.button_text_color) root.style.setProperty("--tg-button-text-color", themeParams.button_text_color);
        }
      }
    };

    initTelegram();
  }, []);

  return (
    <TelegramContext.Provider value={contextValue}>
      {children}
    </TelegramContext.Provider>
  );
}