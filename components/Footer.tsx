import Image from "next/image";

export function Footer() {
  return (
    <footer>
      <div className="container">
        <Image
          src="/assets/coach-skill-logo.png"
          alt="Coach Skill"
          className="logo"
          width={96}
          height={32}
        />
        <p>© Coach Skill 2026 · Value Selling Workshop</p>
      </div>
    </footer>
  );
}
