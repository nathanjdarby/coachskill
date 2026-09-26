"use client";

import { useActionState, useEffect, useRef } from "react";
import type { FormState } from "@/app/actions/types";
import { FieldError, SubmitButton } from "./FormBits";

export type ThreadMessage = {
  id: number;
  body: string;
  mine: boolean;
  senderName: string;
  sentAt: string;
};

export function MessageThread({
  messages,
  emptyText,
}: {
  messages: ThreadMessage[];
  emptyText: string;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  if (messages.length === 0) return <p className="pt-muted pt-thread-empty">{emptyText}</p>;
  return (
    <div className="pt-thread">
      {messages.map((m) => (
        <div key={m.id} className={`pt-bubble-row ${m.mine ? "is-mine" : ""}`}>
          <div className="pt-bubble">
            <p className="pt-bubble-body">{m.body}</p>
            <p className="pt-bubble-meta">
              {m.mine ? "You" : m.senderName} · {m.sentAt}
            </p>
          </div>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}

export function MessageComposer({
  action,
  placeholder,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  placeholder: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="pt-composer"
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          formRef.current?.requestSubmit();
        }
      }}
    >
      <label className="pt-sr-only" htmlFor="message-body">
        Message
      </label>
      <textarea id="message-body" name="body" rows={3} maxLength={10_000} placeholder={placeholder} required />
      <FieldError state={state} name="body" />
      <div className="pt-composer-actions">
        <span className="pt-muted pt-small">⌘ Enter to send</span>
        <SubmitButton pendingLabel="Sending…">Send</SubmitButton>
      </div>
    </form>
  );
}
