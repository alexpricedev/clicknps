if (!process.env.APP_URL) {
  throw new Error("APP_URL is not set");
}

export const stateHelpers = <T>() => ({
  parseState: (url: URL): T => {
    const stateParam = url.searchParams.get("state");
    if (!stateParam) {
      return {} as T;
    }

    try {
      // State is always JSON-encoded, decode and parse it
      const decoded = decodeURIComponent(stateParam);
      return JSON.parse(decoded) as T;
    } catch {
      // Invalid or malicious state, fail safely
      return {} as T;
    }
  },

  buildRedirectUrlWithState: (path: string, state: T): string => {
    if (state && Object.keys(state as Record<string, unknown>).length > 0) {
      // Use proper URI encoding for URL parameters
      const stateParam = encodeURIComponent(JSON.stringify(state));
      return `${path}?state=${stateParam}`;
    }
    return path;
  },
});
