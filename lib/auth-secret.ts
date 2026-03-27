/**
 * Auth.js accepts AUTH_SECRET (preferred in v5) or NEXTAUTH_SECRET.
 * Use this everywhere a JWT secret is required so middleware and NextAuth stay aligned.
 */
export function getAuthSecret(): string | undefined {
  const s =
    process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();
  return s || undefined;
}
