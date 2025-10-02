function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function init(): void {
  // Auto-populate Survey ID from Survey Name
  const titleInput = document.getElementById("title") as HTMLInputElement;
  const surveyIdInput = document.getElementById("surveyId") as HTMLInputElement;

  if (titleInput && surveyIdInput) {
    titleInput.addEventListener("blur", () => {
      if (!surveyIdInput.value.trim()) {
        surveyIdInput.value = slugify(titleInput.value);
      }
    });
  }

  // Redirect behavior radio button handling
  const radioButtons = document.querySelectorAll(
    '[data-action="redirect-timing-radio"]',
  ) as NodeListOf<HTMLInputElement>;
  const warningAlert = document.querySelector(
    '[data-warning="pre-comment"]',
  ) as HTMLElement;
  const urlInput = document.querySelector(
    '[data-element="redirect-url-input"]',
  ) as HTMLElement;

  if (!radioButtons.length || !warningAlert || !urlInput) return;

  radioButtons.forEach((radio) => {
    radio.addEventListener("change", () => {
      if (radio.checked) {
        if (radio.value === "pre_comment") {
          urlInput.classList.remove("hidden");
          warningAlert.classList.remove("hidden");
        } else if (radio.value === "post_comment") {
          urlInput.classList.remove("hidden");
          warningAlert.classList.add("hidden");
        } else {
          urlInput.classList.add("hidden");
          warningAlert.classList.add("hidden");
        }
      }
    });
  });
}
