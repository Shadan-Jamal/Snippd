/**
 * Multi-select helpers for bulk snippet delete.
 */
(function () {
  function selectedCount(form) {
    return form.querySelectorAll('input[name="ids"]:checked').length;
  }

  function updateDeleteButtons(form) {
    if (!form) return;
    const n = selectedCount(form);
    form.querySelectorAll("[data-delete-selected]").forEach((btn) => {
      btn.disabled = n === 0;
      const label = btn.querySelector("[data-delete-label]");
      if (label) label.textContent = n ? `Delete selected (${n})` : "Delete selected";
    });
  }

  document.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;

    if (target.matches("[data-select-all]")) {
      const form = target.closest("form");
      if (!form) return;
      form.querySelectorAll('input[name="ids"]').forEach((cb) => {
        if (cb instanceof HTMLInputElement) cb.checked = target.checked;
      });
      updateDeleteButtons(form);
      return;
    }

    if (target.matches('input[name="ids"]')) {
      const form = target.closest("form");
      if (!form) return;
      const boxes = form.querySelectorAll('input[name="ids"]');
      const checked = form.querySelectorAll('input[name="ids"]:checked');
      form.querySelectorAll("[data-select-all]").forEach((master) => {
        if (master instanceof HTMLInputElement) {
          master.checked = boxes.length > 0 && checked.length === boxes.length;
        }
      });
      updateDeleteButtons(form);
    }
  });

  document.body.addEventListener("htmx:afterSwap", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const form = target.closest("form[data-bulk-delete]");
    if (!form) return;
    form.querySelectorAll("[data-select-all]").forEach((master) => {
      if (master instanceof HTMLInputElement && !target.contains(master)) master.checked = false;
    });
    updateDeleteButtons(form);
  });

  window.snippdConfirmBulkDelete = function (form) {
    const n = selectedCount(form);
    if (!n) return false;
    return window.confirm(
      `Delete ${n} snippet${n === 1 ? "" : "s"}? This cannot be undone.`,
    );
  };
})();
