// Page scripts
import { init as initDashboard } from "@client/pages/dashboard";
import { init as initThankYou } from "@client/pages/thank-you";
import { init as initWebhooks } from "@client/pages/webhooks";

const page = document.body.dataset.page;

const pages: Record<string, () => void> = {
  dashboard: initDashboard,
  "thank-you": initThankYou,
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

// Alert close functionality
document.querySelectorAll('[data-action="close-alert"]').forEach((button) => {
  button.addEventListener("click", () => {
    const alert = button.closest("[data-dismissible]");
    alert?.remove();
  });
});
