// Every page in this app requires a live Supabase session —
// nothing can be statically prerendered at build time.
export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./mobile-ops.css";

export const metadata: Metadata = {
  title: "Cockpit",
  description: "Hospitality inventory cockpit"
};

type RootLayoutProps = {
  children: ReactNode;
};

// Applied before React hydration to avoid a flash of the wrong theme.
const themeBootstrapScript = `(function(){try{var t=localStorage.getItem('bevero-theme');if(t!=='light'&&t!=='dark'){t='dark';}document.documentElement.classList.add('theme-'+t);}catch(e){document.documentElement.classList.add('theme-dark');}})();`;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html className="theme-dark" lang="de" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
