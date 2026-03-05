"use client";

import { useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTelegram } from "@/app/TelegramProvider";

export default function SignIn() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { isInTelegram, initData } = useTelegram();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/shipments");
    }
  }, [status, router]);

  useEffect(() => {
    if (isInTelegram && initData && status === "unauthenticated") {
      signIn("credentials", {
        initData,
        callbackUrl: "/shipments",
      });
    }
  }, [isInTelegram, initData, status]);

  if (status === "loading" || (isInTelegram && initData)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold mb-2 text-gray-800">Welcome</h1>
          <p className="text-gray-600 mb-8">Signing you in via Telegram...</p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <h1 className="text-2xl font-bold mb-2 text-gray-800">Welcome</h1>
        <p className="text-gray-600 mb-8">
          Please open this app via the Telegram bot.
        </p>
        <p className="text-sm text-gray-500">
          Powered by Telegram
        </p>
      </div>
    </div>
  );
}
