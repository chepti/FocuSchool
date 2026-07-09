"use client";

import Link from "next/link";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getAuthClient } from "@/lib/firebase";
import { isStaff, useMember } from "@/lib/useMember";

export function AuthButton() {
  const { user, member, loading } = useMember();

  if (loading) return <div className="w-24" aria-hidden />;

  if (!user) {
    return (
      <button
        type="button"
        onClick={() =>
          signInWithPopup(getAuthClient(), new GoogleAuthProvider())
        }
        className="rounded-full px-4 py-2 text-sm font-medium text-brand-violet ring-1 ring-brand-violet/40 transition hover:bg-brand-purple/10"
      >
        התחברות
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {member && (
        <Link
          href="/add"
          className="rounded-full bg-brand-purple px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-violet"
        >
          + הוספה
        </Link>
      )}
      {isStaff(member) && (
        <Link
          href="/manage"
          className="rounded-full px-3 py-2 text-sm font-medium text-brand-violet transition hover:bg-brand-purple/10"
        >
          ניהול
        </Link>
      )}
      <button
        type="button"
        onClick={() => signOut(getAuthClient())}
        title={user.email ?? undefined}
        className="rounded-full px-3 py-2 text-xs text-ink/50 transition hover:text-ink"
      >
        יציאה
      </button>
    </div>
  );
}
