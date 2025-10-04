import { Layout } from "@server/components/layouts";
import type { AuthContext } from "@server/middleware/auth";
import type { DocNavItem, DocPage } from "@server/services/docs";
import { FileText, Menu } from "lucide-react";

type DocsProps = {
  auth?: AuthContext;
  csrfToken?: string | null;
  page: DocPage;
  navigation: DocNavItem[];
};

function NavItems({
  items,
  currentSlug,
}: {
  items: DocNavItem[];
  currentSlug: string;
}) {
  return (
    <ul className="menu">
      {items.map((item) => (
        <li key={item.slug}>
          {item.children ? (
            <details open>
              <summary>
                <FileText className="w-4 h-4" />
                {item.label}
              </summary>
              <NavItems items={item.children} currentSlug={currentSlug} />
            </details>
          ) : (
            <a
              href={item.slug ? `/docs/${item.slug}` : "/docs"}
              className={currentSlug === item.slug ? "active" : ""}
            >
              <FileText className="w-4 h-4" />
              {item.label}
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}

export const Docs = ({ auth, csrfToken, page, navigation }: DocsProps) => {
  const breadcrumbs = page.slug.split("/").filter(Boolean);

  return (
    <Layout
      title={`${page.title} - Documentation - ClickNPS`}
      description="Learn how to integrate and use ClickNPS effectively with our comprehensive documentation and guides."
      name="docs"
      auth={auth}
      csrfToken={csrfToken}
    >
      <div className="drawer lg:drawer-open">
        <input id="docs-drawer" type="checkbox" className="drawer-toggle" />
        <div className="drawer-content flex flex-col">
          <div className="sticky top-0 z-10 bg-base-100 lg:hidden border-b border-base-300 p-4">
            <label
              htmlFor="docs-drawer"
              className="btn btn-ghost drawer-button"
            >
              <Menu className="w-5 h-5" />
              Menu
            </label>
          </div>

          <div className="p-6 lg:p-8 max-w-4xl">
            {breadcrumbs.length > 0 && breadcrumbs[0] !== "index" && (
              <div className="breadcrumbs text-sm mb-6">
                <ul>
                  <li>
                    <a href="/docs">Docs</a>
                  </li>
                  {breadcrumbs.map((crumb, i) => (
                    <li key={breadcrumbs.slice(0, i + 1).join("/")}>
                      <a
                        href={`/docs/${breadcrumbs.slice(0, i + 1).join("/")}`}
                      >
                        {crumb
                          .split("-")
                          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                          .join(" ")}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <article
              className="prose prose-lg max-w-none"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: markdown content is controlled
              dangerouslySetInnerHTML={{ __html: page.content }}
            />
          </div>
        </div>

        <div className="drawer-side z-20">
          <label
            htmlFor="docs-drawer"
            aria-label="close sidebar"
            className="drawer-overlay"
          />
          <aside className="bg-base-200 min-h-screen w-80 p-4">
            <div className="sticky top-4">
              <div className="flex items-center gap-2 mb-6 px-4">
                <FileText className="w-6 h-6 text-primary" />
                <h2 className="text-xl font-bold">Documentation</h2>
              </div>
              <NavItems items={navigation} currentSlug={page.slug} />
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  );
};
