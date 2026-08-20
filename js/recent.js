const STORAGE_KEY = "defectoSngRecent";
const MAX_RECENT_ITEMS = 8;

function getStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

export function getRecentItems() {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const value = JSON.parse(storage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value.filter(item => item?.route?.view && item?.title) : [];
  } catch {
    return [];
  }
}

export function rememberRecentItem(item) {
  const storage = getStorage();
  if (!storage || !item?.route?.view || !item?.title) return;
  const key = JSON.stringify(item.route);
  const next = [
    { ...item, visitedAt: Date.now() },
    ...getRecentItems().filter(existing => JSON.stringify(existing.route) !== key)
  ].slice(0, MAX_RECENT_ITEMS);
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // История является необязательным улучшением и не должна мешать чтению статей.
  }
}

export function clearRecentItems() {
  try {
    getStorage()?.removeItem(STORAGE_KEY);
  } catch {
    // Нет доступного хранилища.
  }
}
