"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useRef } from "react";

export default function SessionWatcher() {
  const { data: session } = useSession();
  const hasLoggedOutRef = useRef(false);

  useEffect(() => {
    const error = session?.error;

    if (!error) return;

    if (hasLoggedOutRef.current) return;

    if (
      error === "RefreshAccessTokenError" ||
      error === "RefreshTokenExpired"
    ) {
      hasLoggedOutRef.current = true;

      console.info("SessionWatcher auto logout due to:", error);

      signOut({ callbackUrl: "/" });
    }
  }, [session?.error]);

  return null;
}
