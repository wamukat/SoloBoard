export function createTicketRelationPicker(ctx) {
  const { elements } = ctx;

  function getSelectedTickets() {
    return ctx.getSelectedTicketIds().map(ctx.getTicketById).filter(Boolean);
  }

  function syncOptions() {
    const selectedIds = ctx.getSelectedTicketIds();
    const selectedTickets = getSelectedTickets();
    const placeholder = ctx.getPlaceholder();
    elements.summary.innerHTML = selectedTickets.length
      ? selectedTickets.map((ticket) => ctx.renderSummaryChip(ticket, ctx.removeAttr)).join("")
      : placeholder
        ? `<span class="ticket-tag-placeholder">${ctx.escapeHtml(placeholder)}</span>`
        : "";

    if (ctx.getUnavailableMessage) {
      const message = ctx.getUnavailableMessage();
      if (message) {
        elements.options.innerHTML = `<div class="tag-picker-empty">${ctx.escapeHtml(message)}</div>`;
        return;
      }
    }

    const visibleTickets = ctx.getAvailableTickets().filter((ticket) => {
      if (selectedIds.includes(ticket.id)) {
        return true;
      }
      return ctx.matchTicketQuery(ticket, ctx.getQuery());
    });

    elements.options.innerHTML = visibleTickets.length
      ? visibleTickets.map((ticket) => ctx.renderOption(ticket, ctx.optionAttr, selectedIds.includes(ticket.id))).join("")
      : '<div class="tag-picker-empty">No matching tickets</div>';
  }

  function openOptions() {
    if (ctx.canOpen && !ctx.canOpen()) {
      return;
    }
    ctx.closePeerOptions();
    elements.options.hidden = false;
    elements.toggle.setAttribute("aria-expanded", "true");
  }

  function closeOptions() {
    elements.options.hidden = true;
    elements.toggle.setAttribute("aria-expanded", "false");
  }

  function handleFieldClick(event) {
    const removeButton = event.target.closest(`[${ctx.removeAttr}]`);
    if (removeButton) {
      event.preventDefault();
      ctx.removeTicket(Number(removeButton.getAttribute(ctx.removeAttr)));
      return;
    }
    openOptions();
    elements.search.focus();
  }

  function handleSearchInput(event) {
    ctx.setQuery(event.target.value);
    openOptions();
    syncOptions();
  }

  function handleSearchKeydown(event) {
    const selectedIds = ctx.getSelectedTicketIds();
    if (event.key === "Backspace" && !elements.search.value && selectedIds.length > 0) {
      event.preventDefault();
      ctx.removeTicket(selectedIds[selectedIds.length - 1]);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      selectFirstOption();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeOptions();
      elements.search.blur();
    }
  }

  function selectFirstOption() {
    const firstOption = elements.options.querySelector(`[${ctx.optionAttr}]`);
    if (!firstOption) {
      return false;
    }
    selectTicket(Number(firstOption.getAttribute(ctx.optionAttr)));
    return true;
  }

  function selectTicket(ticketId) {
    ctx.selectTicket(ticketId);
    ctx.setQuery("");
    elements.search.value = "";
    syncOptions();
    openOptions();
    elements.search.focus();
  }

  function handleOptionClick(event) {
    const option = event.target.closest?.(`[${ctx.optionAttr}]`);
    if (!option || !elements.options.contains(option)) {
      return false;
    }
    selectTicket(Number(option.getAttribute(ctx.optionAttr)));
    return true;
  }

  return {
    closeOptions,
    handleFieldClick,
    handleOptionClick,
    handleSearchInput,
    handleSearchKeydown,
    openOptions,
    syncOptions,
  };
}
