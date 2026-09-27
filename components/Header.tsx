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
        <Link href="/" className="header-brand">
          <Image
            src="/assets/coach-skill-logo.png"
            alt=""
            className="logo"
            width={120}
            height={40}
          />
          <span className="header-wordmark">Coach Skill</span>
        </Link>
      </div>
    </header>
  );
}
