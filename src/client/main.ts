// Page scripts
import { init as initWebhooks } from "@client/pages/webhooks";

const page = document.body.dataset.page;

const pages: Record<string, () => void> = {
  webhooks: initWebhooks,
};

if (page && pages[page]) {
  pages[page]();
}

// If the query param has state, remove it on the client side
// so we dont show it multiple times
const url = new URL(window.location.href);
if (url.searchParams.get("state")) {
  url.searchParams.delete("state");
}
window.history.replaceState({}, "", url.toString());

// Custom component scripts
import "@client/components/my-paragraph";
