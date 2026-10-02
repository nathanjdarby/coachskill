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
        <p>© Coach Skill 2026</p>
        <a
          className="powered-by"
          href="https://automafoundry.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span>Powered by</span>
          <Image
            src="/assets/automafoundry-logo.png"
            alt="AutomaFoundry"
            width={560}
            height={96}
          />
        </a>
      </div>
    </footer>
  );
}
