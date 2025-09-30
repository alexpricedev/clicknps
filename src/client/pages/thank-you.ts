export function init(): void {
  // Handle close button click
  const closeButton = document.querySelector(
    '[data-action="close"]',
  ) as HTMLButtonElement;
  if (closeButton) {
    closeButton.addEventListener("click", () => {
      window.close();
    });
  }
}
