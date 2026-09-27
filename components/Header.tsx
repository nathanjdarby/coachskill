import Image from "next/image";
import Link from "next/link";

export function Header({ back = false }: { back?: boolean }) {
  return (
    <header>
      <div className="container">
        {back && (
          <Link href="/" className="header-back">
            <span aria-hidden>←</span> Back
          </Link>
        )}
        <Link href="/" className="header-logo-link">
          <Image
            src="/assets/coach-skill-logo.png"
            alt="Coach Skill"
            className="logo"
            width={120}
            height={40}
          />
        </Link>
      </div>
    </header>
  );
}
