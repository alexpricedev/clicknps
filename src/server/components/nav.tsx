const navLinks = [
  { href: "/", label: "Home", name: "home" },
  { href: "/about", label: "About", name: "about" },
  { href: "/examples", label: "Examples", name: "examples" },
  { href: "/surveys", label: "Surveys", name: "surveys" },
  { href: "/settings/api-keys", label: "Settings", name: "settings" },
  { href: "/contact", label: "Contact", name: "contact" },
];

export const Nav = ({ page }: { page: string }) => (
  <div className="navbar container mx-auto px-0">
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
    <div className="flex-none">
      <ul className="menu menu-horizontal px-0 space-x-2">
        {navLinks.map(({ href, label, name }) => (
          <li key={name}>
            <a
              href={href}
              className={page === name ? "btn btn-active" : "btn btn-ghost"}
              aria-current={page === name ? "page" : undefined}
            >
              {label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  </div>
);
