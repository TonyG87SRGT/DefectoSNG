export function getArticleShareUrl(routeHash, locationHref = globalThis.location?.href) {
  if (!locationHref) throw new Error("Не удалось определить адрес страницы.");
  return new URL(routeHash, locationHref).href;
}

function copyWithSelection(text, documentRef) {
  if (!documentRef?.body || typeof documentRef.execCommand !== "function") return false;

  const field = documentRef.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.setAttribute("aria-hidden", "true");
  field.style.position = "fixed";
  field.style.inset = "-9999px auto auto -9999px";
  documentRef.body.append(field);
  field.select();

  try {
    return documentRef.execCommand("copy");
  } finally {
    field.remove();
  }
}

export async function copyArticleShareUrl(text, {
  navigatorRef = globalThis.navigator,
  documentRef = globalThis.document
} = {}) {
  try {
    if (typeof navigatorRef?.clipboard?.writeText !== "function") throw new Error("Clipboard API недоступен");
    await navigatorRef.clipboard.writeText(text);
    return "clipboard";
  } catch {
    if (copyWithSelection(text, documentRef)) return "selection";
    throw new Error("Не удалось скопировать ссылку.");
  }
}
