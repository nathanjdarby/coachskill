import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { timingSafeEqual } from "crypto";
import { getAuthSecret } from "@/lib/auth-secret";

function timingSafeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: getAuthSecret(),
  pages: {
    signIn: "/admin/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7,
  },
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const emailRaw = credentials?.email;
        const password = credentials?.password;
        const email =
          typeof emailRaw === "string" ? emailRaw.trim() : "";
        if (
          !email ||
          password === undefined ||
          password === null ||
          typeof password !== "string"
        ) {
          return null;
        }

        const adminEmail = process.env.ADMIN_EMAIL?.trim();
        if (!adminEmail || email !== adminEmail) {
          return null;
        }

        const hash = process.env.ADMIN_PASSWORD_HASH?.trim();
        if (hash) {
          const ok = await bcrypt.compare(password, hash);
          if (!ok) return null;
        } else {
          const plain = process.env.ADMIN_PASSWORD?.trim();
          if (!plain || !timingSafeEqualString(password, plain)) {
            return null;
          }
        }

        return { id: "admin", email: adminEmail };
      },
    }),
  ],
});
