import { DefaultSession } from "next-auth";

type Role = "admin" | "client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      clientId: number | null;
      sessionVersion: number;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    clientId: number | null;
    sessionVersion: number;
  }
}
