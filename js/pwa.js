let refreshing = false;
let updatePromptShownFor = null;

function showPwaUpdatePrompt(worker) {
  if (!worker || updatePromptShownFor === worker) return;
  updatePromptShownFor = worker;

  document.getElementById("pwa-update-prompt")?.remove();

  const prompt = document.createElement("div");
  prompt.id = "pwa-update-prompt";
  prompt.className = "pwa-update-prompt";
  prompt.setAttribute("role", "status");
  prompt.setAttribute("aria-live", "polite");
  prompt.innerHTML = `
    <div class="pwa-update-prompt__text">
      <strong>Доступна новая версия</strong>
      <span>Обновите DefectoSNG, чтобы получить последние изменения.</span>
    </div>
    <div class="pwa-update-prompt__actions">
      <button type="button" class="pwa-update-prompt__button" data-update-pwa>Обновить</button>
      <button type="button" class="pwa-update-prompt__dismiss" data-dismiss-pwa-update aria-label="Закрыть сообщение об обновлении">×</button>
    </div>
  `;

  document.body.appendChild(prompt);
  requestAnimationFrame(() => prompt.classList.add("visible"));

  prompt.querySelector("[data-update-pwa]").addEventListener("click", event => {
    event.currentTarget.disabled = true;
    event.currentTarget.textContent = "Обновление…";
    worker.postMessage({ type: "SKIP_WAITING" });
  });

  prompt.querySelector("[data-dismiss-pwa-update]").addEventListener("click", () => {
    prompt.classList.remove("visible");
    window.setTimeout(() => prompt.remove(), 250);
  });
}

function watchInstallingWorker(registration) {
  const worker = registration.installing;
  if (!worker) return;

  worker.addEventListener("statechange", () => {
    if (worker.state === "installed" && navigator.serviceWorker.controller) {
      showPwaUpdatePrompt(registration.waiting || worker);
    }
  });
}

export function registerPwa() {
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register(
        new URL("../sw.js", import.meta.url),
        { type: "module" }
      );

      console.info("Service Worker registered:", registration.scope);

      if (registration.waiting) showPwaUpdatePrompt(registration.waiting);
      registration.addEventListener("updatefound", () => {
        watchInstallingWorker(registration);
      });

      const checkForUpdate = () => registration.update().catch(error => {
        console.warn("Service Worker update check failed:", error);
      });

      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") checkForUpdate();
      });

      window.setInterval(checkForUpdate, 60 * 60 * 1000);
    } catch (error) {
      console.error("Service Worker registration failed:", error);
    }
  });
}
