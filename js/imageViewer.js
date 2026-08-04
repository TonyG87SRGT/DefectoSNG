let activeViewer = null;
let previouslyFocused = null;

function closeImageViewer() {
  if (!activeViewer) return;

  activeViewer.remove();
  activeViewer = null;
  document.body.classList.remove("image-viewer-open");

  if (previouslyFocused instanceof HTMLElement) {
    previouslyFocused.focus();
  }
  previouslyFocused = null;
}

function openImageViewer(image) {
  closeImageViewer();
  previouslyFocused = image;

  const overlay = document.createElement("div");
  overlay.className = "image-viewer";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", image.alt
    ? `Просмотр изображения: ${image.alt}`
    : "Просмотр изображения");

  const closeButton = document.createElement("button");
  closeButton.className = "image-viewer-close";
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", "Закрыть изображение");
  closeButton.textContent = "×";

  const fullImage = document.createElement("img");
  fullImage.src = image.dataset.fullImage || image.src;
  fullImage.alt = image.alt || "";
  overlay.append(closeButton, fullImage);

  activeViewer = overlay;
  document.body.classList.add("image-viewer-open");
  document.body.appendChild(overlay);
  closeButton.focus();

  overlay.addEventListener("click", event => {
    if (event.target === overlay || event.target.closest(".image-viewer-close")) {
      closeImageViewer();
    }
  });

  overlay.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeImageViewer();
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      overlay.querySelector(".image-viewer-close")?.focus();
    }
  });
}

export function setupImageViewer() {
  document.addEventListener("click", event => {
    const image = event.target.closest(".zoomable-image");
    if (image) openImageViewer(image);
  });

  document.addEventListener("keydown", event => {
    const image = event.target.closest?.(".zoomable-image");
    if (image && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      openImageViewer(image);
    }
  });
}
