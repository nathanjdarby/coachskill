"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { formatPence } from "@/lib/money";
import { formatDateTime } from "@/lib/time";
import { FALLBACK_OFFER, type WorkshopOffer } from "@/lib/workshop-offer";

type CheckoutContextType = {
  /** Opens the checkout for the date the visitor has chosen on the page. */
  openCheckout: (offer?: WorkshopOffer) => void;
  closeCheckout: () => void;
};

const CheckoutContext = createContext<CheckoutContextType | null>(null);

export function useCheckout() {
  const ctx = useContext(CheckoutContext);
  if (!ctx) throw new Error("useCheckout must be used within CheckoutProvider");
  return ctx;
}

export function CheckoutProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [offer, setOffer] = useState<WorkshopOffer>(FALLBACK_OFFER);
  const formRef = useRef<HTMLFormElement>(null);
  const deposit = formatPence(offer.depositPence);

  const openCheckout = useCallback((next?: WorkshopOffer) => {
    setOffer(next ?? FALLBACK_OFFER);
    setStep(1);
    setError(null);
    setEmailError(null);
    formRef.current?.reset();
    setIsOpen(true);
    document.body.style.overflow = "hidden";
  }, []);

  const closeCheckout = useCallback(() => {
    setIsOpen(false);
    document.body.style.overflow = "";
  }, []);

  const goToStep = useCallback((s: number) => setStep(s), []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCheckout();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [closeCheckout]);

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleNextStep = () => {
    const name = (
      document.getElementById("checkout-name") as HTMLInputElement
    )?.value.trim();
    const email = (
      document.getElementById("checkout-email") as HTMLInputElement
    )?.value?.trim();
    if (!name || !email) return;
    if (!isValidEmail(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }
    setEmailError(null);
    goToStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const name = (
      document.getElementById("checkout-name") as HTMLInputElement
    )?.value.trim();
    const email = (
      document.getElementById("checkout-email") as HTMLInputElement
    )?.value?.trim();
    if (!name || !email) return;
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, workshopSlug: offer.slug ?? undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError("Invalid response from server");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CheckoutContext.Provider value={{ openCheckout, closeCheckout }}>
      {children}
      <div
        className={`modal-overlay ${isOpen ? "is-open" : ""}`}
        aria-hidden={!isOpen}
      >
        <div className="modal">
          <button
            type="button"
            className="modal-close"
            onClick={closeCheckout}
            aria-label="Close"
          >
            ×
          </button>
          <h3>Secure your place</h3>
          <p className="modal-subtitle">
            {deposit} deposit
            {offer.startsAt ? ` · ${formatDateTime(new Date(offer.startsAt))}` : ""}
          </p>

          <form ref={formRef} className="checkout-form" onSubmit={handleSubmit}>
            <div className="step-indicator">
              <span
                className={`step-dot ${step === 1 ? "is-active" : ""}`}
                data-step="1"
              />
              <span
                className={`step-dot ${step === 2 ? "is-active" : ""}`}
                data-step="2"
              />
            </div>

            <div className="checkout-steps">
              <div
                className={`checkout-step ${step === 1 ? "is-active" : ""}`}
                data-step="1"
              >
                <div className="form-group">
                  <label htmlFor="checkout-name">Name</label>
                  <input
                    type="text"
                    id="checkout-name"
                    name="name"
                    placeholder="Jane Smith"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="checkout-email">Email</label>
                  <input
                    type="email"
                    id="checkout-email"
                    name="email"
                    placeholder="jane@company.com"
                    required
                    onChange={() => setEmailError(null)}
                  />
                  {emailError && (
                    <p className="checkout-error" role="alert">
                      {emailError}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleNextStep}
                >
                  Continue
                </button>
              </div>

              <div
                className={`checkout-step ${step === 2 ? "is-active" : ""}`}
                data-step="2"
              >
                {offer.startsAt && (
                  <p className="checkout-summary">
                    {offer.name}
                    <br />
                    <strong>{formatDateTime(new Date(offer.startsAt))}</strong>
                    {offer.location ? ` · ${offer.location}` : ""}
                  </p>
                )}
                <div className="amount-row">
                  Deposit today <strong>{deposit}</strong>
                </div>
                <p className="checkout-stripe-note">
                  You&apos;ll complete payment securely on Stripe.
                </p>
                {error && (
                  <p className="checkout-error" role="alert">
                    {error}
                  </p>
                )}
                <div className="btn-row">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => goToStep(1)}
                    disabled={isLoading}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isLoading}
                  >
                    {isLoading ? "Redirecting…" : `Pay ${deposit}`}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </CheckoutContext.Provider>
  );
}
