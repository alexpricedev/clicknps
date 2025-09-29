export function init(): void {
  // Handle test webhook button click
  const testButton = document.querySelector(
    '[data-action="test-webhook"]',
  ) as HTMLButtonElement;
  if (testButton) {
    testButton.addEventListener("click", () => {
      const testForm = document.getElementById(
        "test-webhook-form",
      ) as HTMLFormElement;
      if (testForm) {
        testForm.submit();
      }
    });
  }
}
