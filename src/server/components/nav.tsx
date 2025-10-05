import {
  BookOpen,
  ClipboardList,
  DollarSign,
  Home,
  LogIn,
  LogOut,
  Menu,
  Settings,
  UserPlus,
  X,
} from "lucide-react";
import { isAdminOrOwner } from "../middleware/access";
import type { AuthContext } from "../middleware/auth";
import { CsrfField } from "./csrf-field";

const guestNavLinks = [
  { href: "/", label: "Home", name: "home" },
  { href: "/pricing", label: "Pricing", name: "pricing" },
  { href: "/docs", label: "Docs", name: "docs" },
];

const authNavLinks = [
  { href: "/", label: "Dashboard", name: "dashboard" },
  { href: "/surveys", label: "Surveys", name: "surveys" },
  { href: "/docs", label: "Docs", name: "docs" },
];

const settingsLinks = [
  { href: "/settings/api-keys", label: "API Keys", adminOnly: true },
  { href: "/settings/webhooks", label: "Webhooks", adminOnly: true },
  { href: "/settings/profile", label: "Profile", adminOnly: false },
  { href: "/settings/team", label: "Team", adminOnly: true },
  { href: "/settings/support", label: "Support", adminOnly: false },
];

type NavProps = {
  page: string;
  auth?: AuthContext;
  csrfToken?: string | null;
};

export const Nav = ({ page, auth, csrfToken }: NavProps) => (
  <div className="navbar container mx-auto px-4 sm:px-8">
    <div className="flex-1">
      <a
        className="flex items-center text-xl font-bold hover:text-primary group"
        href="/"
      >
        <div className="mr-2 border-2 rounded-lg p-1 group-hover:border-primary">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-label="ClickNPS Logo"
            className="w-4 h-4 group-hover:text-white"
          >
            <title>ClickNPS Logo</title>
            <path d="M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z" />
          </svg>
        </div>
        ClickNPS
      </a>
    </div>

    {/* Desktop Navigation */}
    <div className="hidden lg:flex grow justify-end align-middle">
      {auth?.isAuthenticated ? (
        <div className="flex items-stretch gap-2">
          {authNavLinks.map(({ href, label, name }) => (
            <a
              key={name}
              href={href}
              className={
                page === name
                  ? "btn btn-ghost text-primary rounded-btn"
                  : "btn btn-ghost hover:text-primary rounded-btn"
              }
              aria-current={page === name ? "page" : undefined}
            >
              {label}
            </a>
          ))}
          <div className="dropdown dropdown-end">
            <button
              type="button"
              className="btn btn-ghost hover:text-primary rounded-btn"
            >
              Settings
              <svg
                className="fill-current"
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
              >
                <title>Settings dropdown arrow</title>
                <path d="m7 10 5 5 5-5z" />
              </svg>
            </button>
            <ul className="menu dropdown-content bg-base-300 rounded-b-box z-[1] mt-2 w-40 p-2 shadow-sm">
              {settingsLinks
                .filter(
                  ({ adminOnly }) =>
                    !adminOnly || (auth && isAdminOrOwner(auth)),
                )
                .map(({ href, label }) => (
                  <li key={href}>
                    <a href={href}>{label}</a>
                  </li>
                ))}
              <li>
                <form method="POST" action="/auth/logout">
                  <CsrfField token={csrfToken || null} />
                  <button type="submit" className="w-full text-left">
                    Log out
                  </button>
                </form>
              </li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="flex items-stretch gap-2">
          {guestNavLinks.map(({ href, label, name }) => (
            <a
              key={name}
              href={href}
              className={
                page === name
                  ? "btn btn-ghost text-primary rounded-btn"
                  : "btn btn-ghost hover:text-primary rounded-btn"
              }
              aria-current={page === name ? "page" : undefined}
            >
              {label}
            </a>
          ))}
          <a href="/login" className="btn btn-neutral rounded-btn">
            Log in
          </a>
          <a href="/signup" className="btn btn-primary rounded-btn">
            Sign up free
          </a>
        </div>
      )}
    </div>

    {/* Mobile Navigation */}
    <div className="flex lg:hidden items-center gap-2">
      {!auth?.isAuthenticated && (
        <a href="/signup" className="btn btn-primary btn-sm rounded-btn">
          Sign up free
        </a>
      )}
      <div className="drawer drawer-end">
        <input
          id="mobile-nav-drawer"
          type="checkbox"
          className="drawer-toggle"
        />
        <div className="drawer-content">
          <label
            htmlFor="mobile-nav-drawer"
            className="btn btn-ghost btn-square"
          >
            <Menu className="h-5 w-5" />
          </label>
        </div>
        <div className="drawer-side z-50">
          <label
            htmlFor="mobile-nav-drawer"
            aria-label="Close menu"
            className="drawer-overlay"
          />
          <div className="menu bg-base-200 min-h-full w-80 p-4">
            <div className="flex justify-end items-center mb-4">
              <label
                htmlFor="mobile-nav-drawer"
                className="btn btn-ghost btn-sm btn-circle"
              >
                <X className="h-5 w-5" />
              </label>
            </div>
            {auth?.isAuthenticated ? (
              <ul className="menu text-base w-full p-0 pr-4 [&>li]:mb-2">
                <li>
                  <a href="/" className={page === "dashboard" ? "active" : ""}>
                    <Home className="h-5 w-5" />
                    Dashboard
                  </a>
                </li>
                <li>
                  <a
                    href="/surveys"
                    className={page === "surveys" ? "active" : ""}
                  >
                    <ClipboardList className="h-5 w-5" />
                    Surveys
                  </a>
                </li>
                <li>
                  <a href="/docs" className={page === "docs" ? "active" : ""}>
                    <BookOpen className="h-5 w-5" />
                    Docs
                  </a>
                </li>
                <li>
                  <details>
                    <summary>
                      <Settings className="h-5 w-5" />
                      Settings
                    </summary>
                    <ul>
                      {settingsLinks
                        .filter(
                          ({ adminOnly }) =>
                            !adminOnly || (auth && isAdminOrOwner(auth)),
                        )
                        .map(({ href, label }) => (
                          <li key={href}>
                            <a href={href}>{label}</a>
                          </li>
                        ))}
                    </ul>
                  </details>
                </li>
                <li>
                  <form method="POST" action="/auth/logout">
                    <CsrfField token={csrfToken || null} />
                    <button
                      type="submit"
                      className="w-full text-left flex items-center gap-2"
                    >
                      <LogOut className="h-5 w-5" />
                      Log out
                    </button>
                  </form>
                </li>
              </ul>
            ) : (
              <ul className="menu text-base w-full p-0 pr-4 [&>li]:mb-2">
                <li>
                  <a href="/" className={page === "home" ? "active" : ""}>
                    <Home className="h-5 w-5" />
                    Home
                  </a>
                </li>
                <li>
                  <a
                    href="/pricing"
                    className={page === "pricing" ? "active" : ""}
                  >
                    <DollarSign className="h-5 w-5" />
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="/docs" className={page === "docs" ? "active" : ""}>
                    <BookOpen className="h-5 w-5" />
                    Docs
                  </a>
                </li>
                <li>
                  <a href="/login">
                    <LogIn className="h-5 w-5" />
                    Log in
                  </a>
                </li>
                <li>
                  <a href="/signup">
                    <UserPlus className="h-5 w-5" />
                    Sign up free
                  </a>
                </li>
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
);
