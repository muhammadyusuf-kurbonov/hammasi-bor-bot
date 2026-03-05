import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import crypto from "crypto";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

function validateTelegramInitData(initData: string, botToken: string): boolean {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return false;

  params.delete("hash");

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  const computedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  return computedHash === hash;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Telegram",
      credentials: {
        initData: { label: "Telegram Init Data", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.initData) return null;

        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (!botToken) {
          console.error("TELEGRAM_BOT_TOKEN is not set");
          return null;
        }

        if (!validateTelegramInitData(credentials.initData, botToken)) {
          console.error("Invalid Telegram initData signature");
          return null;
        }

        try {
          const params = new URLSearchParams(credentials.initData);
          const userJson = params.get("user");
          if (!userJson) return null;

          const telegramUser = JSON.parse(userJson);
          const telegramId = telegramUser.id;

          let user = await db.query.users.findFirst({
            where: eq(users.telegramId, telegramId),
          });

          if (!user) {
            const [newUser] = await db
              .insert(users)
              .values({
                telegramId,
                username: telegramUser.username || null,
                firstName: telegramUser.first_name || null,
                lastName: telegramUser.last_name || null,
                isActive: true,
              })
              .returning();
            user = newUser;
          }

          return {
            id: user.id.toString(),
            name:
              `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
              user.username ||
              "Unknown",
            email: `${telegramId}@telegram.user`,
            image: null,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.sub as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
