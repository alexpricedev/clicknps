export function init(): void {
  const showRolesButton = document.querySelector(
    '[data-action="show-roles-info"]',
  ) as HTMLButtonElement;
  const rolesCard = document.querySelector(
    '[data-element="roles-info-card"]',
  ) as HTMLElement;

  if (!showRolesButton || !rolesCard) return;

  showRolesButton.addEventListener("click", () => {
    rolesCard.classList.toggle("hidden");
  });
}
