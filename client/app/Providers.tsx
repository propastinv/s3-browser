"use client";

import { ThemeProvider } from "next-themes"
import { SessionProvider } from "next-auth/react";
import SessionWatcher from "@/components/SessionWatcher";
import { Session } from "next-auth";

type ProvidersProps = {
  children: React.ReactNode;
  session?: Session | null;
};

export default function Providers({ children, session }: ProvidersProps) {
  return (
    <SessionProvider session={session}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem
      >
        <SessionWatcher />
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}