import { calculateVisibleWindow } from "./app-board-utils.js";
import { renderTag } from "./app-tags.js";
import { icon } from "./icons.js";

export const LIST_ROW_HEIGHT = 44;
export const LIST_OVERSCAN = 12;

export function getListTickets(tickets) {
  const byId = new Map(tickets.map((ticket) => [ticket.id, ticket]));
  const roots = tickets
    .filter((ticket) => ticket.parentTicketId == null || !byId.has(ticket.parentTicketId))
    .sort((a, b) => a.priority - b.priority || a.id - b.id);
  const ordered = [];
  const seen = new Set();
  for (const root of roots) {
    ordered.push({ ticket: root, indent: 0 });
    seen.add(root.id);
    const children = tickets
      .filter((candidate) => candidate.parentTicketId === root.id)
      .sort((a, b) => a.priority - b.priority || a.id - b.id);
    for (const child of children) {
      ordered.push({ ticket: child, indent: 1 });
      seen.add(child.id);
    }
  }
  for (const ticket of tickets.sort((a, b) => a.priority - b.priority || a.id - b.id)) {
    if (!seen.has(ticket.id)) {
      ordered.push({ ticket, indent: ticket.parentTicketId == null ? 0 : 1 });
    }
  }
  return ordered;
}

export function renderListActions(tickets, selectedTicketIds) {
  const selectedTickets = tickets.filter((ticket) => selectedTicketIds.includes(ticket.id));
  if (selectedTickets.length === 0) {
    return '<div class="list-actions list-actions-empty"><span>Select tickets to edit in bulk</span></div>';
  }
  const buttons = [];
  if (selectedTickets.some((ticket) => !ticket.isResolved)) {
    buttons.push(`<button type="button" class="list-action-button action-with-icon" data-bulk-resolve="true">${icon("check")}<span>Mark Resolved</span></button>`);
  }
  if (selectedTickets.some((ticket) => ticket.isResolved)) {
    buttons.push(`<button type="button" class="list-action-button action-with-icon" data-bulk-resolve="false">${icon("circle")}<span>Reopen</span></button>`);
  }
  if (selectedTickets.some((ticket) => !ticket.isArchived)) {
    buttons.push(`<button type="button" class="list-action-button action-with-icon" data-bulk-archive="true">${icon("archive")}<span>Archive</span></button>`);
  }
  if (selectedTickets.some((ticket) => ticket.isArchived)) {
    buttons.push(`<button type="button" class="list-action-button action-with-icon" data-bulk-archive="false">${icon("rotate-ccw")}<span>Restore</span></button>`);
  }
  buttons.push(`<button type="button" class="list-action-button action-with-icon danger" data-bulk-delete="true">${icon("trash-2")}<span>Delete</span></button>`);
  return `
      <div class="list-actions">
        <span class="list-selection-count">${selectedTickets.length} selected</span>
        ${buttons.join("")}
      </div>
    `;
}

export function createListBoardModule(ctx, options) {
  const { state, elements } = ctx;
  const { hasUserTicketFilters, renderEmptyState, renderTicketStatusIcons } = options;
  let listModel = null;

  function reset() {
    listModel = null;
  }

  function renderListBoard(detail) {
    state.selectedListTicketIds = state.selectedListTicketIds.filter((ticketId) => detail.tickets.some((ticket) => ticket.id === ticketId));
    if (detail.tickets.length === 0) {
      elements.listBoard.className = "list-board empty";
      const firstLaneId = state.boardDetail?.lanes?.[0]?.id;
      elements.listBoard.innerHTML = hasUserTicketFilters()
        ? renderEmptyState({
          iconName: "search",
          title: "No matching tickets",
          body: "Try a different search, tag, lane, or resolved filter.",
        })
        : renderEmptyState({
          iconName: "list",
          title: state.filters.resolved === "false" ? "No unresolved tickets" : "No tickets yet",
          body: state.filters.resolved === "false"
            ? "Create a ticket or switch the resolved filter to All."
            : "Create the first ticket, then switch between Kanban and List as it grows.",
          actionLabel: firstLaneId ? "Create ticket" : "",
          actionAttr: firstLaneId ? `data-empty-create-ticket="${firstLaneId}"` : "",
        });
      listModel = null;
      return;
    }
    elements.listBoard.className = "list-board";
    const orderedTickets = getListTickets(detail.tickets);
    const visibleTicketIds = orderedTickets.map(({ ticket }) => ticket.id);
    const allSelected = visibleTicketIds.length > 0 && visibleTicketIds.every((ticketId) => state.selectedListTicketIds.includes(ticketId));
    const previousScrollTop = elements.listBoard.querySelector(".list-viewport")?.scrollTop ?? 0;
    const actions = renderListActions(detail.tickets, state.selectedListTicketIds);
    elements.listBoard.innerHTML = `
      ${actions}
      <div class="list-header">
        <div><input type="checkbox" id="list-select-all" ${allSelected ? "checked" : ""} /></div>
        <div>ID / Title</div>
        <div>Blockers</div>
        <div>Tags</div>
        <div>Priority</div>
        <div>Lane</div>
        <div>Status</div>
      </div>
      <div class="list-viewport">
        <div class="list-spacer" style="height:${orderedTickets.length * LIST_ROW_HEIGHT}px">
          <div class="list-window"></div>
        </div>
      </div>
      ${actions}
    `;
    listModel = { orderedTickets, visibleTicketIds, rowHeight: LIST_ROW_HEIGHT, overscan: LIST_OVERSCAN };
    const viewport = elements.listBoard.querySelector(".list-viewport");
    if (viewport) {
      viewport.scrollTop = previousScrollTop;
    }
    const selectAll = elements.listBoard.querySelector("#list-select-all");
    if (selectAll) {
      const selectedCount = visibleTicketIds.filter((ticketId) => state.selectedListTicketIds.includes(ticketId)).length;
      selectAll.indeterminate = selectedCount > 0 && selectedCount < visibleTicketIds.length;
    }
    paintVisibleListRows();
  }

  function renderListRow(entry) {
    const { ticket, indent } = entry;
    const tags = ticket.tags
      .map((tag) => renderTag(tag, ctx.escapeHtml))
      .join("");
    const blockedByTickets = state.boardTickets.filter((candidate) => ticket.blockerIds.includes(candidate.id));
    const blockedBy = blockedByTickets.length
      ? `blocked by ${blockedByTickets
          .map(
            (blocker) =>
              `<span class="ticket-ref-inline${blocker.isResolved ? " ticket-ref-resolved" : ""}">#${blocker.id}</span>`,
          )
          .join(", ")}`
      : "";
    const blocks = state.boardTickets
      .filter((candidate) => candidate.id !== ticket.id && candidate.blockerIds.includes(ticket.id))
      .map(
        (candidate) =>
          `<span class="ticket-ref-inline${candidate.isResolved ? " ticket-ref-resolved" : ""}">#${candidate.id}</span>`,
      );
    const relations = [
      blockedBy,
      blocks.length ? `blocks ${blocks.join(", ")}` : "",
    ].filter(Boolean).join(" · ");
    const lane = state.boardDetail.lanes.find((item) => item.id === ticket.laneId);
    const statusIcons = renderTicketStatusIcons(ticket);
    return `
      <div class="list-row ${ticket.isResolved ? "resolved" : ""} ${ticket.isArchived ? "archived" : ""}" style="height:${LIST_ROW_HEIGHT}px">
        <input type="checkbox" data-list-ticket-id="${ticket.id}" ${state.selectedListTicketIds.includes(ticket.id) ? "checked" : ""} />
        <button type="button" class="list-ticket-link indent-${indent}" data-open-ticket-id="${ticket.id}">
          <span class="ticket-id">#${ticket.id}</span>
          <span>${ctx.escapeHtml(ticket.title)}</span>
        </button>
        <div class="list-cell muted">${relations || "-"}</div>
        <div class="tag-list">${tags || '<span class="muted">-</span>'}</div>
        <div class="list-cell">${ticket.priority}</div>
        <div class="list-cell muted">${ctx.escapeHtml(lane?.name || "Open")}</div>
        <div class="list-cell list-status-cell">${statusIcons || '<span class="muted">-</span>'}</div>
      </div>
    `;
  }

  function paintVisibleListRows() {
    if (!listModel) {
      return;
    }
    const viewport = elements.listBoard.querySelector(".list-viewport");
    const windowEl = elements.listBoard.querySelector(".list-window");
    if (!viewport || !windowEl) {
      return;
    }
    const { startIndex, endIndex } = calculateVisibleWindow(
      listModel.orderedTickets.length,
      listModel.rowHeight,
      listModel.overscan,
      viewport.scrollTop,
      viewport.clientHeight,
    );
    const visibleEntries = listModel.orderedTickets.slice(startIndex, endIndex);
    windowEl.style.transform = `translateY(${startIndex * listModel.rowHeight}px)`;
    windowEl.innerHTML = visibleEntries.map(renderListRow).join("");
  }

  async function updateSelectedListTickets(isResolved) {
    const ticketIds = [...state.selectedListTicketIds];
    if (ticketIds.length === 0) {
      return;
    }
    await ctx.sendJson(`/api/boards/${state.activeBoardId}/tickets/bulk-complete`, {
      method: "POST",
      body: { ticketIds, isResolved },
    });
    state.selectedListTicketIds = [];
    await ctx.refreshBoardDetail();
  }

  async function updateSelectedListArchive(isArchived) {
    const ticketIds = [...state.selectedListTicketIds];
    if (ticketIds.length === 0) {
      return;
    }
    await ctx.sendJson(`/api/boards/${state.activeBoardId}/tickets/bulk-archive`, {
      method: "POST",
      body: { ticketIds, isArchived },
    });
    state.selectedListTicketIds = [];
    await ctx.refreshBoardDetail();
  }

  async function deleteSelectedListTickets() {
    const ticketIds = [...state.selectedListTicketIds];
    if (ticketIds.length === 0) {
      return;
    }
    await ctx.confirmAndRun({
      title: "Delete Tickets",
      message: `Delete ${ticketIds.length} selected ticket${ticketIds.length === 1 ? "" : "s"}?`,
      submitLabel: "Delete",
      run: async () => {
        for (const ticketId of ticketIds) {
          await ctx.api(`/api/tickets/${ticketId}`, { method: "DELETE" });
        }
        state.selectedListTicketIds = [];
        await ctx.refreshBoardDetail();
      },
    });
  }

  function handleListTicketSelection(event) {
    const ticketId = Number(event.target.dataset.listTicketId);
    if (event.target.checked) {
      state.selectedListTicketIds = [...new Set([...state.selectedListTicketIds, ticketId])];
    } else {
      state.selectedListTicketIds = state.selectedListTicketIds.filter((id) => id !== ticketId);
    }
    ctx.renderBoardDetail();
  }

  function handleListSelectAll(event, visibleTicketIds) {
    if (event.target.checked) {
      state.selectedListTicketIds = [...new Set([...state.selectedListTicketIds, ...visibleTicketIds])];
    } else {
      const visibleSet = new Set(visibleTicketIds);
      state.selectedListTicketIds = state.selectedListTicketIds.filter((ticketId) => !visibleSet.has(ticketId));
    }
    ctx.renderBoardDetail();
  }

  function handleListBoardClick(event) {
    const createTicketButton = event.target.closest("[data-empty-create-ticket]");
    if (createTicketButton && elements.listBoard.contains(createTicketButton)) {
      ctx.openEditor(null, "edit", Number(createTicketButton.dataset.emptyCreateTicket));
      return;
    }
    const openButton = event.target.closest("[data-open-ticket-id]");
    if (openButton && elements.listBoard.contains(openButton)) {
      ctx.openEditor(Number(openButton.dataset.openTicketId), "view");
      return;
    }
    const bulkButton = event.target.closest(".list-action-button");
    if (bulkButton && elements.listBoard.contains(bulkButton) && !bulkButton.disabled) {
      if (bulkButton.dataset.bulkDelete) {
        deleteSelectedListTickets();
        return;
      }
      if (bulkButton.dataset.bulkArchive) {
        updateSelectedListArchive(bulkButton.dataset.bulkArchive === "true");
        return;
      }
      updateSelectedListTickets(bulkButton.dataset.bulkResolve === "true");
    }
  }

  function handleListBoardChange(event) {
    const ticketCheckbox = event.target.closest("[data-list-ticket-id]");
    if (ticketCheckbox && elements.listBoard.contains(ticketCheckbox)) {
      handleListTicketSelection({ target: ticketCheckbox });
      return;
    }
    const selectAll = event.target.closest("#list-select-all");
    if (selectAll && listModel) {
      handleListSelectAll({ target: selectAll }, listModel.visibleTicketIds);
    }
  }

  function handleListBoardScroll(event) {
    if (event.target?.classList?.contains("list-viewport")) {
      paintVisibleListRows();
    }
  }

  return {
    handleListBoardChange,
    handleListBoardClick,
    handleListBoardScroll,
    paintVisibleListRows,
    renderListBoard,
    reset,
  };
}
