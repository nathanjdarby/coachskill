"use client";

import { useState } from "react";

/** "Video call or phone call?" plus the number to ring, for booking forms. */
export function CallTypeFields({
  defaultPhone = "",
  defaultType = "video",
  idPrefix = "ct",
  forAdmin = false,
}: {
  defaultPhone?: string;
  /** Start on what they said they'd prefer. */
  defaultType?: "video" | "phone";
  idPrefix?: string;
  /** Monika scheduling a call herself: worded from her side. */
  forAdmin?: boolean;
}) {
  const [type, setType] = useState<"video" | "phone">(defaultType);
  return (
    <fieldset className="ct">
      <legend className="ct-legend">{forAdmin ? "Video or phone?" : "How would you like to talk?"}</legend>
      <div className="ct-options">
        {(
          [
            ["video", "Video call", forAdmin ? "A private video room" : "A private video room in your browser"],
            ["phone", "Phone call", forAdmin ? "You ring them" : "Monika will ring you"],
          ] as const
        ).map(([value, label, hint]) => (
          <label key={value} className={`ct-option ${type === value ? "is-selected" : ""}`}>
            <input type="radio" name="callType" value={value} checked={type === value} onChange={() => setType(value)} />
            <span>
              <span className="ct-label">{label}</span>
              <span className="pt-muted pt-small">{hint}</span>
            </span>
          </label>
        ))}
      </div>
      {type === "phone" && (
        <div className="pt-field">
          <label htmlFor={`${idPrefix}-phone`}>{forAdmin ? "Number to call" : "Number for Monika to call"}</label>
          <input id={`${idPrefix}-phone`} name="phone" type="tel" autoComplete="tel" defaultValue={defaultPhone} placeholder="07700 900123" required maxLength={30} />
        </div>
      )}
    </fieldset>
  );
}
