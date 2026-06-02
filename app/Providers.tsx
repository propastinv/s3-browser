"use client";

import { ThemeProvider } from "next-themes"
import { SessionProvider } from "next-auth/react";
import SessionWatcher from "@/components/SessionWatcher";
import { Session } from "next-auth";
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const orig = console.error;
  console.error = (...args: any[]) => {
    if (typeof args[0] === 'string' && args[0].includes('Encountered a script tag while rendering React component')) {
      return;
    }
    orig.apply(console, args);
  };
}

type ProvidersProps = {
  children: React.ReactNode;
  session?: Session | null;
};

export default function Providers({ children, session }: ProvidersProps) {
  return (
    <SessionProvider session={session}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem
      >
        <TooltipProvider>
          <SessionWatcher />
          {children}
          <Toaster position="top-right" />
        </TooltipProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}