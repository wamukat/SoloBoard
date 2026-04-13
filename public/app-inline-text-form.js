export function createInlineTextForm({ className, html, inputSelector, onSubmit, onCancel }) {
  const form = document.createElement("form");
  form.className = className;
  form.innerHTML = html;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await onSubmit(form.querySelector(inputSelector));
  });
  form.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }
    event.preventDefault();
    onCancel();
  });
  form.addEventListener("focusout", () => {
    window.setTimeout(() => {
      const input = form.querySelector(inputSelector);
      if (!form.contains(document.activeElement) && !input?.value.trim()) {
        onCancel();
      }
    });
  });

  requestAnimationFrame(() => {
    form.querySelector(inputSelector)?.focus();
  });

  return form;
}
