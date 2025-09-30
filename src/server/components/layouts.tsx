import type React from "react";

import type { AuthContext } from "../middleware/auth";
import { Nav } from "./nav";

type LayoutProps = {
  title: string;
  name: string;
  children: React.ReactNode;
  auth?: AuthContext;
  csrfToken?: string | null;
};

/**
 * Main application layout with header, navigation, and footer
 * Use for: Authenticated app pages, public marketing pages
 */
export function Layout({
  title,
  name,
  children,
  auth,
  csrfToken,
}: LayoutProps) {
  return (
    <html lang="en" data-theme="night">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <title>{title}</title>
        <link rel="stylesheet" href="/assets/main.css" />
      </head>
      <body data-page={name}>
        <header className="bg-base-300 mb-8 border-b border-base-content/15 px-4 sm:px-0">
          <Nav page={name} auth={auth} csrfToken={csrfToken} />
        </header>
        <main className="container mx-auto px-4 sm:px-0 pb-8">{children}</main>
        <script type="module" src="/assets/main.js" />
      </body>
    </html>
  );
}

type BaseLayoutProps = {
  title: string;
  name: string;
  children: React.ReactNode;
  theme?: string;
};

/**
 * Minimal layout without navigation or header
 * Use for: Authentication pages, error pages, standalone forms
 */
export function BaseLayout({
  title,
  name,
  children,
  theme = "dracula",
}: BaseLayoutProps) {
  return (
    <html lang="en" data-theme={theme}>
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <title>{title}</title>
        <link rel="stylesheet" href="/assets/main.css" />
      </head>
      <body data-page={name}>
        {children}
        <script type="module" src="/assets/main.js" />
      </body>
    </html>
  );
}
