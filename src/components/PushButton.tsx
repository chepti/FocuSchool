"use client";

import { useState } from "react";
import { subscribeToPush, type PushSubscribeResult } from "@/lib/push";

const MESSAGES: Record<Exclude<PushSubscribeResult, "ok">, string> = {
  denied: "ההרשאה נדחתה — אפשר לאשר מחדש בהגדרות האתר בדפדפן",
  unsupported: "הדפדפן הזה לא תומך בהתראות (באייפון: הוסיפו למסך הבית קודם)",
  error: "משהו השתבש — נסו שוב",
};

/** כפתור הרשמה לנוטיפיקציות — מוצג לחברים מחוברים בלבד */
export function PushButton({
  schoolId,
  email,
}: {
  schoolId: string;
  email: string;
}) {
  const [state, setState] = useState<PushSubscribeResult | "idle" | "busy">(
    "idle",
  );

  if (state === "ok") {
    return (
      <p className="text-sm font-medium text-green-700">
        ✓ נרשמתם לעדכונים מבית הספר
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={state === "busy"}
        onClick={async () => {
          setState("busy");
          setState(await subscribeToPush(schoolId, email));
        }}
        className="rounded-full bg-brand-pink px-4 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-purple disabled:opacity-50"
      >
        🔔 קבלו עדכונים מבית הספר
      </button>
      {state !== "idle" && state !== "busy" && (
        <span className="text-xs text-ink/60">{MESSAGES[state]}</span>
      )}
    </div>
  );
}
