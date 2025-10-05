import type React from "react";

import type { AuthContext } from "../middleware/auth";
import { Footer } from "./footer";
import { Nav } from "./nav";

type LayoutProps = {
  title: string;
  description: string;
  name: string;
  children: React.ReactNode;
  auth?: AuthContext;
  csrfToken?: string | null;
  containerized?: boolean;
};

/**
 * Main application layout with header, navigation, and footer
 * Use for: Authenticated app pages, public marketing pages
 * Set containerized=false for full-width landing pages
 */
export function Layout({
  title,
  description,
  name,
  children,
  auth,
  csrfToken,
  containerized = true,
}: LayoutProps) {
  const mainClasses = containerized
    ? "container mx-auto px-4 sm:px-8 pb-8"
    : "";

  return (
    <html lang="en" data-theme="night">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="icon" href="/favicon.ico" />
        <link rel="stylesheet" href="/assets/main.css" />
      </head>
      <body data-page={name}>
        <header className="bg-base-300 mb-8 border-b border-base-content/15">
          <Nav page={name} auth={auth} csrfToken={csrfToken} />
        </header>
        <main className={mainClasses}>{children}</main>
        <Footer auth={auth} />
        <script type="module" src="/assets/main.js" />
      </body>
    </html>
  );
}

type BaseLayoutProps = {
  title: string;
  description: string;
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
  description,
  name,
  children,
}: BaseLayoutProps) {
  return (
    <html lang="en" data-theme="night">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="icon" href="/favicon.ico" />
        <link rel="stylesheet" href="/assets/main.css" />
      </head>
      <body data-page={name}>
        {children}
        <Footer />
        <script type="module" src="/assets/main.js" />
      </body>
    </html>
  );
}
