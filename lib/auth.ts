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
      const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN?.trim().toLowerCase();
      if (!allowedDomain) return true;
      const email = user.email?.trim().toLowerCase();
      return email?.endsWith(`@${allowedDomain}`) ?? false;
    },
    async session({ session }) {
      return session;
    },
    async jwt({ token }) {
      return token;
    },
  },
};
