import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getAuthSecret } from "@/lib/auth-secret";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";

// Compared against when the email is unknown, so response time doesn't reveal which emails have accounts.
const DUMMY_HASH = "$2b$12$V9RL7DUK.XaM3ZNHGGZs4e4PitxHiP8fKKC1T5CJS7Rv7/EjRGdNG";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: getAuthSecret(),
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7,
  },
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        token.role = user.role;
        token.clientId = user.clientId;
        token.sessionVersion = user.sessionVersion;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.role = token.role as "admin" | "client";
        session.user.clientId = (token.clientId as number | null) ?? null;
        session.user.sessionVersion = (token.sessionVersion as number) ?? 0;
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
        const email =
          typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : "";
        const password = credentials?.password;
        if (!email || typeof password !== "string" || !password) {
          throw new CredentialsSignin();
        }

        const db = getDb();
        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
        if (!user?.passwordHash || !ok) {
          throw new CredentialsSignin();
        }

        await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
          role: user.role,
          clientId: user.clientId,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
});
