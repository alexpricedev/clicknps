import type { JSX } from "react";

const settingsLinks = [
  { href: "/settings/api-keys", label: "API Keys", name: "api-keys" },
  { href: "/settings/webhooks", label: "Webhooks", name: "webhooks" },
];

export interface SettingsNavProps {
  currentPage: string;
}

export const SettingsNav = ({ currentPage }: SettingsNavProps): JSX.Element => (
  <div className="border-b border-gray-200 mb-8">
    <nav className="-mb-px flex space-x-8" aria-label="Settings navigation">
      {settingsLinks.map(({ href, label, name }) => {
        const isActive = currentPage === name;
        return (
          <a
            key={name}
            href={href}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              isActive
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            {label}
          </a>
        );
      })}
    </nav>
  </div>
);
