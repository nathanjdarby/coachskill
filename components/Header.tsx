import Image from "next/image";
import Link from "next/link";

export function Header() {
  return (
    <header>
      <div className="container">
        <Link href="/" className="header-logo-link">
          <Image
            src="/assets/coach-skill-logo.png"
            alt="Coach Skill"
            className="logo"
            width={120}
            height={40}
          />
        </Link>
        <nav className="header-nav">
          <Link href="/" className="header-link">
            Home
          </Link>
          <Link href="/meet-monika" className="header-link">
            Meet Monika
          </Link>
        </nav>
      </div>
    </header>
  );
}
