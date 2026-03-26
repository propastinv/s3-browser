import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/app/globals.css";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import Providers from "@/app/Providers";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/next-auth-options";
import { getBucketsForGroups } from '@/lib/buckets';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "S3 Browser",
  description: "A simple S3 browser",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);
  const hasBackend = Boolean(process.env.BACKEND_URL);
  const buckets = getBucketsForGroups(session?.user?.groups ?? []);
  const companyName = process.env.COMPANY_NAME as string;
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers session={session}>
          <SidebarProvider
            style={
              {
                "--sidebar-width": "calc(var(--spacing) * 72)",
                "--header-height": "calc(var(--spacing) * 12)",
              } as React.CSSProperties
            }
          >
            <AppSidebar variant="inset" hasBackend={hasBackend} buckets={buckets} companyName={companyName} />
            <SidebarInset>
              <SiteHeader />
              {children}
            </SidebarInset>
          </SidebarProvider>
        </Providers>
      </body>
    </html>
  );
}
