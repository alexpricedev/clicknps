/**
 * Special words that should be displayed in all caps when appearing in titles/labels
 */
const SPECIAL_CAPITALIZED_WORDS = new Set([
  "API",
  "URL",
  "HTTP",
  "HTTPS",
  "HTML",
  "CSS",
  "JS",
  "JSON",
  "XML",
  "SQL",
  "REST",
  "GraphQL",
  "SDK",
  "CLI",
  "UI",
  "UX",
  "DB",
  "CRUD",
  "CSV",
  "PDF",
  "JWT",
  "OAuth",
  "OIDC",
  "SSO",
  "SAML",
  "LDAP",
  "DNS",
  "SSL",
  "TLS",
  "IP",
  "TCP",
  "UDP",
  "FTP",
  "SFTP",
  "SSH",
  "RESTful",
  "AJAX",
  "DOM",
  "BOM",
  "CDN",
  "CMS",
  "CRM",
  "ERP",
  "SaaS",
  "PaaS",
  "IaaS",
  "B2B",
  "B2C",
  "C2C",
  "MVP",
  "FAQ",
  "SEO",
  "SEM",
  "ROI",
  "KPI",
  "CRM",
  "ERP",
  "GDPR",
  "CCPA",
  "HIPAA",
  "SOC",
  "PCI",
  "ISO",
  "GDPR",
]);

/**
 * Converts a string to title case while preserving special capitalized words
 * @param text - The text to convert
 * @returns The text in title case with special words properly capitalized
 */
export function toTitleCase(text: string): string {
  return text
    .split(/\s+/)
    .map((word) => {
      // Remove any non-alphanumeric characters for comparison
      const cleanWord = word.replace(/[^a-zA-Z0-9]/g, "");

      // Check if the clean word should be all caps
      if (SPECIAL_CAPITALIZED_WORDS.has(cleanWord.toUpperCase())) {
        // Replace the original word with the properly capitalized version
        return word.replace(/[a-zA-Z]+/g, cleanWord.toUpperCase());
      }

      // For common short words like "and", "or", "of", "to", "in", etc., keep lowercase unless first word
      const lowerWord = word.toLowerCase();
      const commonWords = new Set([
        "and",
        "or",
        "of",
        "to",
        "in",
        "on",
        "at",
        "by",
        "for",
        "with",
        "the",
        "a",
        "an",
      ]);

      if (commonWords.has(lowerWord)) {
        return lowerWord;
      }

      // Default title case for regular words
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

/**
 * Converts a slug to a human-readable label with proper capitalization
 * @param slug - The slug to convert (e.g., "api-overview" or "user-guide")
 * @returns A properly capitalized label (e.g., "API Overview" or "User Guide")
 */
export function slugToLabel(slug: string): string {
  const parts = slug.split("/").filter(Boolean);
  const lastPart = parts[parts.length - 1] || slug;

  // Convert hyphens to spaces and use toTitleCase for consistent formatting
  return toTitleCase(lastPart.replace(/-/g, " "));
}
