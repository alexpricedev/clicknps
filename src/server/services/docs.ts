import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { marked } from "marked";

export interface DocPage {
  slug: string;
  title: string;
  content: string;
}

export interface DocNavItem {
  slug: string;
  label: string;
  children?: DocNavItem[];
}

const DOCS_DIR = join(process.cwd(), "docs");

async function fileExists(path: string): Promise<boolean> {
  const file = Bun.file(path);
  return file.exists();
}

async function readMarkdownFile(filePath: string): Promise<string> {
  const file = Bun.file(filePath);
  return file.text();
}

function extractTitle(markdown: string): string {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : "Untitled";
}

function slugToLabel(slug: string): string {
  const parts = slug.split("/").filter(Boolean);
  const lastPart = parts[parts.length - 1] || slug;
  return lastPart
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export async function getDocPage(slug: string): Promise<DocPage | null> {
  const normalizedSlug = slug || "index";
  const filePath = join(DOCS_DIR, `${normalizedSlug}.md`);

  if (!(await fileExists(filePath))) {
    return null;
  }

  const markdown = await readMarkdownFile(filePath);
  const title = extractTitle(markdown);
  const content = await marked.parse(markdown);

  return {
    slug: normalizedSlug,
    title,
    content,
  };
}

async function buildNavFromDirectory(
  dir: string,
  baseSlug = "",
): Promise<DocNavItem[]> {
  const items: DocNavItem[] = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const slug = baseSlug ? `${baseSlug}/${entry.name}` : entry.name;
        const children = await buildNavFromDirectory(
          join(dir, entry.name),
          slug,
        );
        items.push({
          slug,
          label: slugToLabel(entry.name),
          children,
        });
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        const fileName = entry.name.replace(/\.md$/, "");

        if (fileName === "index" && !baseSlug) {
          items.push({
            slug: "",
            label: "Home",
          });
        } else {
          const slug = baseSlug ? `${baseSlug}/${fileName}` : fileName;
          const label =
            fileName === "index"
              ? slugToLabel(baseSlug)
              : slugToLabel(fileName);
          items.push({
            slug,
            label,
          });
        }
      }
    }
  } catch {
    return [];
  }

  return items.sort((a, b) => {
    if (a.slug === "") return -1;
    if (b.slug === "") return 1;
    return a.label.localeCompare(b.label);
  });
}

export async function getDocNavigation(): Promise<DocNavItem[]> {
  return buildNavFromDirectory(DOCS_DIR);
}
