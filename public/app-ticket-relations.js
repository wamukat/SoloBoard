import { icon } from "./icons.js";
import { createTicketRelationPicker } from "./app-ticket-relation-picker.js";

export function createTicketRelationsModule(ctx, options) {
  const { state, elements } = ctx;

  function getBoardTickets() {
    return state.boardTickets ?? [];
  }

  function getTicketById(ticketId) {
    return getBoardTickets().find((ticket) => ticket.id === ticketId) ?? null;
  }

  function hasChildOnBoard(ticketId) {
    return getBoardTickets().some((ticket) => ticket.parentTicketId === ticketId);
  }

  function getBlockingTickets(ticketId) {
    return getBoardTickets().filter((ticket) => ticket.id !== ticketId && ticket.blockerIds.includes(ticketId));
  }

  function formatTicketChoice(ticket) {
    return `#${ticket.id} ${ticket.title}`;
  }

  function matchTicketQuery(ticket, query) {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return true;
    }
    const idText = String(ticket.id);
    const hashText = `#${ticket.id}`;
    return idText.includes(normalized) || hashText.includes(normalized) || ticket.title.toLowerCase().includes(normalized);
  }

  function renderTicketSummaryChip(ticket, removeAttr) {
    return `<button type="button" class="ticket-tag-chip ticket-ref-chip" ${removeAttr}="${ticket.id}" title="Remove ${ctx.escapeHtml(formatTicketChoice(ticket))}"><span class="ticket-ref-chip-id">#${ticket.id}</span><span class="ticket-ref-chip-text">${ctx.escapeHtml(ticket.title)}</span>${icon("x")}</button>`;
  }

  function renderTicketOption(ticket, attrName, isSelected) {
    const meta = ticket.isResolved ? '<span class="ticket-picker-meta">Resolved</span>' : "";
    return `
      <button type="button" class="tag-picker-item ${isSelected ? "selected" : ""}" ${attrName}="${ticket.id}" role="option" aria-selected="${isSelected}">
        <span class="ticket-picker-id">#${ticket.id}</span>
        <span class="tag-picker-text">${ctx.escapeHtml(ticket.title)}</span>
        ${meta}
      </button>
    `;
  }

  function getAvailableBlockerTickets() {
    const currentId = state.editingTicketId;
    return getBoardTickets()
      .filter((ticket) => ticket.id !== currentId)
      .filter((ticket) => currentId == null || !ticket.blockerIds.includes(currentId))
      .sort((a, b) => b.priority - a.priority || a.id - b.id);
  }

  function getSelectedParentId() {
    return elements.ticketParent.value ? Number(elements.ticketParent.value) : null;
  }

  function getAvailableParentTickets() {
    return getBoardTickets()
      .filter((ticket) => ticket.id !== state.editingTicketId)
      .filter((ticket) => ticket.parentTicketId == null)
      .sort((a, b) => b.priority - a.priority || a.id - b.id);
  }

  function setParent(ticketId) {
    elements.ticketParent.value = ticketId == null ? "" : String(ticketId);
    state.parentQuery = "";
    elements.ticketParentSearch.value = "";
    parentPicker.syncOptions();
    handleParentChange();
    parentPicker.openOptions();
    elements.ticketParentSearch.focus();
  }

  function toggleBlocker(ticketId) {
    if (state.editorBlockerIds.includes(ticketId)) {
      state.editorBlockerIds = state.editorBlockerIds.filter((id) => id !== ticketId);
    } else {
      state.editorBlockerIds = [...state.editorBlockerIds, ticketId];
    }
    state.blockerQuery = "";
    elements.ticketBlockerSearch.value = "";
    blockerPicker.syncOptions();
    blockerPicker.openOptions();
    elements.ticketBlockerSearch.focus();
  }

  function getAvailableChildTickets() {
    if (!state.editingTicketId || getSelectedParentId() != null) {
      return [];
    }
    return getBoardTickets()
      .filter((ticket) => ticket.id !== state.editingTicketId)
      .filter((ticket) => state.editorChildIds.includes(ticket.id) || (ticket.parentTicketId == null && !hasChildOnBoard(ticket.id)))
      .sort((a, b) => b.priority - a.priority || a.id - b.id);
  }

  function syncChildPickerAvailability() {
    const canEditChildren = Boolean(state.editingTicketId) && getSelectedParentId() == null;
    elements.ticketChildrenRow.hidden = !state.editingTicketId;
    elements.ticketChildSearch.disabled = !canEditChildren;
    elements.ticketChildToggle.classList.toggle("is-disabled", !canEditChildren);
    if (!canEditChildren) {
      childPicker.closeOptions();
      if (getSelectedParentId() != null) {
        state.editorChildIds = [];
      }
    }
  }

  function toggleChild(ticketId) {
    if (state.editorChildIds.includes(ticketId)) {
      state.editorChildIds = state.editorChildIds.filter((id) => id !== ticketId);
    } else {
      state.editorChildIds = [...state.editorChildIds, ticketId];
    }
    state.childQuery = "";
    elements.ticketChildSearch.value = "";
    childPicker.syncOptions();
    childPicker.openOptions();
    elements.ticketChildSearch.focus();
  }

  function handleParentChange() {
    syncChildPickerAvailability();
    childPicker.syncOptions();
  }

  const relationPickerContext = {
    escapeHtml: ctx.escapeHtml,
    getTicketById,
    matchTicketQuery,
    renderOption: renderTicketOption,
    renderSummaryChip: renderTicketSummaryChip,
  };

  const parentPicker = createTicketRelationPicker({
    ...relationPickerContext,
    optionAttr: "data-parent-id",
    removeAttr: "data-remove-parent-id",
    elements: {
      toggle: elements.ticketParentToggle,
      summary: elements.ticketParentSummary,
      search: elements.ticketParentSearch,
      options: elements.ticketParentOptions,
    },
    closePeerOptions: () => {
      options.tagPicker.closeOptions();
      blockerPicker.closeOptions();
      childPicker.closeOptions();
    },
    getAvailableTickets: getAvailableParentTickets,
    getPlaceholder: () => "",
    getQuery: () => state.parentQuery,
    getSelectedTicketIds: () => {
      const selectedParentId = getSelectedParentId();
      return selectedParentId == null ? [] : [selectedParentId];
    },
    removeTicket: () => setParent(null),
    selectTicket: setParent,
    setQuery: (value) => {
      state.parentQuery = value;
    },
  });

  const blockerPicker = createTicketRelationPicker({
    ...relationPickerContext,
    optionAttr: "data-blocker-id",
    removeAttr: "data-remove-blocker-id",
    elements: {
      toggle: elements.ticketBlockerToggle,
      summary: elements.ticketBlockerSummary,
      search: elements.ticketBlockerSearch,
      options: elements.ticketBlockerOptions,
    },
    closePeerOptions: () => {
      options.tagPicker.closeOptions();
      parentPicker.closeOptions();
      childPicker.closeOptions();
    },
    getAvailableTickets: getAvailableBlockerTickets,
    getPlaceholder: () => "",
    getQuery: () => state.blockerQuery,
    getSelectedTicketIds: () => [...state.editorBlockerIds],
    removeTicket: toggleBlocker,
    selectTicket: toggleBlocker,
    setQuery: (value) => {
      state.blockerQuery = value;
    },
  });

  const childPicker = createTicketRelationPicker({
    ...relationPickerContext,
    optionAttr: "data-child-id",
    removeAttr: "data-remove-child-id",
    elements: {
      toggle: elements.ticketChildToggle,
      summary: elements.ticketChildSummary,
      search: elements.ticketChildSearch,
      options: elements.ticketChildOptions,
    },
    canOpen: () => Boolean(state.editingTicketId) && getSelectedParentId() == null,
    closePeerOptions: () => {
      options.tagPicker.closeOptions();
      parentPicker.closeOptions();
      blockerPicker.closeOptions();
    },
    getAvailableTickets: getAvailableChildTickets,
    getPlaceholder: () => (state.editingTicketId ? (getSelectedParentId() != null ? "Clear parent to edit children" : "") : "Save ticket first"),
    getQuery: () => state.childQuery,
    getSelectedTicketIds: () => [...state.editorChildIds],
    getUnavailableMessage: () => (!state.editingTicketId || getSelectedParentId() != null ? "Children cannot be edited while this ticket has a parent" : ""),
    removeTicket: toggleChild,
    selectTicket: toggleChild,
    setQuery: (value) => {
      state.childQuery = value;
    },
  });

  function syncOptions() {
    parentPicker.syncOptions();
    blockerPicker.syncOptions();
    syncChildPickerAvailability();
    childPicker.syncOptions();
  }

  function closeOptions() {
    parentPicker.closeOptions();
    blockerPicker.closeOptions();
    childPicker.closeOptions();
  }

  function handleOptionClick(event) {
    return blockerPicker.handleOptionClick(event) ||
      childPicker.handleOptionClick(event) ||
      parentPicker.handleOptionClick(event);
  }

  function containsTarget(target) {
    return elements.ticketParentToggle.contains(target) ||
      elements.ticketParentOptions.contains(target) ||
      elements.ticketBlockerToggle.contains(target) ||
      elements.ticketBlockerOptions.contains(target) ||
      elements.ticketChildToggle.contains(target) ||
      elements.ticketChildOptions.contains(target);
  }

  return {
    closeOptions,
    containsTarget,
    getBlockingTickets,
    handleBlockerFieldClick: blockerPicker.handleFieldClick,
    handleBlockerSearchInput: blockerPicker.handleSearchInput,
    handleBlockerSearchKeydown: blockerPicker.handleSearchKeydown,
    handleChildFieldClick: childPicker.handleFieldClick,
    handleChildSearchInput: childPicker.handleSearchInput,
    handleChildSearchKeydown: childPicker.handleSearchKeydown,
    handleOptionClick,
    handleParentChange,
    handleParentFieldClick: parentPicker.handleFieldClick,
    handleParentSearchInput: parentPicker.handleSearchInput,
    handleParentSearchKeydown: parentPicker.handleSearchKeydown,
    openBlockerOptions: blockerPicker.openOptions,
    openChildOptions: childPicker.openOptions,
    openParentOptions: parentPicker.openOptions,
    syncOptions,
  };
}
