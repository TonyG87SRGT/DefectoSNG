const documentRef = globalThis.document;

export const content = documentRef?.getElementById("app-content") || null;
export const searchInput = documentRef?.getElementById("search") || null;
export const navButtons = documentRef?.querySelectorAll(".nav-button") || [];

export function setActiveNav(action) {
  navButtons.forEach(button => {
    const active = button.dataset.action === action;
    button.classList.toggle("active", active);
    if (active) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current");
    }
  });
}
