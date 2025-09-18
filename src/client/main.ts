// Page scripts
import { init as initAbout } from "@client/pages/about";
import { init as initContact } from "@client/pages/contact";
import { init as initHome } from "@client/pages/home";

const page = document.body.dataset.page;

const pages: Record<string, () => void> = {
  home: initHome,
  about: initAbout,
  contact: initContact,
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
