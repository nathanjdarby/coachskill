"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type JitsiApi = {
  addListener: (event: string, fn: (...args: unknown[]) => void) => void;
  executeCommand: (command: string, ...args: unknown[]) => void;
  dispose: () => void;
};
declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (domain: string, options: Record<string, unknown>) => JitsiApi;
  }
}

export type RoomSetup = { appId: string; roomName: string; jwt: string; directUrl: string };
export type Presence = { target: "a" | "w"; token?: string; id?: number };

const HEARTBEAT_MS = 60_000;

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    if (window.JitsiMeetExternalAPI) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    const script = existing ?? document.createElement("script");
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("load failed")), { once: true });
    if (!existing) {
      script.src = src;
      script.async = true;
      document.head.appendChild(script);
    }
  });
}

/**
 * The in-app video call (8x8 JaaS). Reports joins, leaves and a heartbeat so Coach
 * Skill knows who attended; Monika's version can show her notes beside the call.
 */
export function MeetingRoom({
  setup,
  displayName,
  subject,
  title,
  whenLabel,
  backHref,
  presence,
  notes,
}: {
  setup: RoomSetup;
  displayName: string;
  subject: string;
  title: string;
  whenLabel: string;
  backHref: string;
  presence: Presence;
  /** Shown beside the call (Monika's notes). */
  notes?: React.ReactNode;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  useEffect(() => {
    let api: JitsiApi | null = null;
    let beat: ReturnType<typeof setInterval> | null = null;
    let joined = false;
    let disposed = false;
    const sessionKey = crypto.randomUUID();

    const report = (event: "join" | "beat" | "leave", beacon = false) => {
      const body = JSON.stringify({ ...presence, event, sessionKey, name: displayName });
      if (beacon && navigator.sendBeacon) {
        navigator.sendBeacon("/api/meet/presence", new Blob([body], { type: "application/json" }));
        return;
      }
      void fetch("/api/meet/presence", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
    };
    const leave = (beacon = false) => {
      if (!joined) return;
      joined = false;
      if (beat) clearInterval(beat);
      report("leave", beacon);
    };
    const onPageHide = () => leave(true);

    loadScript(`https://8x8.vc/${setup.appId}/external_api.js`)
      .then(() => {
        if (disposed || !hostRef.current || !window.JitsiMeetExternalAPI) return;
        api = new window.JitsiMeetExternalAPI("8x8.vc", {
          roomName: setup.roomName,
          jwt: setup.jwt,
          parentNode: hostRef.current,
          width: "100%",
          height: "100%",
          userInfo: { displayName },
          configOverwrite: {
            subject,
            prejoinConfig: { enabled: true },
            disableDeepLinking: true,
          },
          interfaceConfigOverwrite: { MOBILE_APP_PROMO: false },
        });
        api.addListener("videoConferenceJoined", () => {
          joined = true;
          report("join");
          beat = setInterval(() => report("beat"), HEARTBEAT_MS);
        });
        api.addListener("videoConferenceLeft", () => leave());
        api.addListener("readyToClose", () => {
          leave();
          window.location.assign(backHref);
        });
      })
      .catch(() => setFailed(true));

    window.addEventListener("pagehide", onPageHide);
    return () => {
      disposed = true;
      window.removeEventListener("pagehide", onPageHide);
      leave(true);
      api?.dispose();
    };
    // The room is set up once per page; props don't change while it's open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`mr ${notes && showNotes ? "has-notes" : ""}`}>
      <header className="mr-bar">
        <Link href={backHref} className="mr-back" aria-label="Leave and go back">
          ←
        </Link>
        <div className="mr-title">
          <p>{title}</p>
          <p className="mr-when">{whenLabel}</p>
        </div>
        {notes && (
          <button type="button" className="mr-toggle" aria-pressed={showNotes} onClick={() => setShowNotes((v) => !v)}>
            {showNotes ? "Hide notes" : "Notes"}
          </button>
        )}
        <a href={setup.directUrl} className="mr-toggle" target="_blank" rel="noreferrer" title="Open the call in its own tab">
          New tab ↗
        </a>
      </header>
      <div className="mr-body">
        <div className="mr-call" ref={hostRef}>
          {failed && (
            <div className="mr-failed">
              <p>The call couldn&apos;t load here.</p>
              <a href={setup.directUrl} className="pt-btn pt-btn-primary" target="_blank" rel="noreferrer">
                Open the call in a new tab
              </a>
            </div>
          )}
        </div>
        {notes && <aside className="mr-notes">{notes}</aside>}
      </div>
    </div>
  );
}
