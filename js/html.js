export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export const escapeAttribute = escapeHtml;

export function safeText(value, fallback = "") {
  const text = value == null || value === "" ? fallback : value;
  return escapeHtml(text);
}
