"use client";
import { signIn, signOut } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button"
import {
  IconLogout
} from "@tabler/icons-react"

export function SignIn() {
  const [callbackUrl] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("callbackUrl") || "/";
    }
    return "/";
  });

  return (
    <Button
      onClick={() => signIn("keycloak", { callbackUrl })}
      variant="outline" type="button"
      className="cursor-pointer"
    >
      <span className="leading-[1.2]">Login with SSO</span>
    </Button>
  );
}

export const SignOut = () => {
  return (
    <button
      onClick={() => signOut()}
      type="button"
      className="flex gap-2 cursor-pointer">
      <IconLogout />
      Log out
    </button>
  );
};
