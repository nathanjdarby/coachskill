import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Client login | Coach Skill",
  description: "The Coach Skill client portal is coming soon.",
};

export default function ClientLoginPage() {
  return (
    <>
      <Header />
      <main>
        <section className="section client-login">
          <div className="container home-center">
            <p className="eyebrow">Client portal</p>
            <h1 className="hero-title client-login-title">Coming soon</h1>
            <p className="section-lead">
              A dedicated space for my clients is on its way. In the meantime,
              I&apos;ll stay in touch with you directly by email.
            </p>
            <div className="home-hero-actions home-hero-actions-center">
              <Link href="/" className="cta cta-hero">
                Back to home
              </Link>
              <Link href="/discovery-call" className="home-secondary-link">
                Not a client yet? <strong>Book a discovery call</strong>{" "}
                <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
