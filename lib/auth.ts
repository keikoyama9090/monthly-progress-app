import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "mock",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "mock",
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user }) {
      const email = user.email?.trim().toLowerCase();
      if (!email) return false;

      const allowedEmails = process.env.ALLOWED_EMAILS?.split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
      if (allowedEmails && allowedEmails.length > 0) {
        return allowedEmails.includes(email);
      }

      const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN?.trim().toLowerCase();
      if (!allowedDomain) return true;
      return email.endsWith(`@${allowedDomain}`);
    },
    async session({ session }) {
      return session;
    },
    async jwt({ token }) {
      return token;
    },
  },
};
