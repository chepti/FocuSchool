"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { getAuthClient, getDb } from "./firebase";
import type { Member } from "./types";
import { SCHOOL_ID } from "./config";

export interface MemberState {
  user: User | null;
  member: Member | null;
  loading: boolean;
}

/** מצב ההתחברות + תפקיד המשתמש בבית הספר (לפי מייל ברשימת members) */
export function useMember(schoolId = SCHOOL_ID): MemberState {
  const [state, setState] = useState<MemberState>({
    user: null,
    member: null,
    loading: true,
  });

  useEffect(() => {
    return onAuthStateChanged(getAuthClient(), async (user) => {
      let member: Member | null = null;
      if (user?.email) {
        try {
          const snap = await getDoc(
            doc(getDb(), "schools", schoolId, "members", user.email.toLowerCase()),
          );
          member = snap.exists() ? (snap.data() as Member) : null;
        } catch {
          member = null;
        }
      }
      setState({ user, member, loading: false });
    });
  }, [schoolId]);

  return state;
}

export function isStaff(member: Member | null): boolean {
  return member?.role === "admin" || member?.role === "publisher";
}
