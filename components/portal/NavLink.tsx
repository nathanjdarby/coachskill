"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({
  href,
  exact = false,
  also = [],
  className = "",
  children,
}: {
  href: string;
  exact?: boolean;
  /** Other path prefixes that should also mark this link active. */
  also?: string[];
  className?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const matches = (p: string) => pathname === p || pathname.startsWith(`${p}/`);
  const active = exact ? pathname === href : matches(href) || also.some(matches);
  return (
    <Link href={href} className={`pt-nav-link ${active ? "is-active" : ""} ${className}`} aria-current={active ? "page" : undefined}>
      {children}
    </Link>
  );
}
