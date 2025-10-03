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
    <div className="flex grow justify-end align-middle">
      {auth?.isAuthenticated ? (
        <div className="flex items-stretch">
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
        <div className="flex items-stretch">
          {guestNavLinks.map(({ href, label, name }) => (
            <a
              key={name}
              href={href}
              className={
                page === name
                  ? "btn btn-active rounded-btn"
                  : "btn btn-ghost rounded-btn"
              }
              aria-current={page === name ? "page" : undefined}
            >
              {label}
            </a>
          ))}
          <a href="/login" className="btn btn-outline btn-primary rounded-btn">
            Log in
          </a>
          <a href="/signup" className="btn btn-primary rounded-btn">
            Sign up free
          </a>
        </div>
      )}
    </div>
  </div>
);
