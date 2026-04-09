const state = {
  boards: [],
  activeBoardId: null,
  boardDetail: null,
  boardTickets: [],
  boardEvents: null,
  boardEventsBoardId: null,
  boardRefreshInFlight: false,
  boardRefreshQueued: false,
  viewMode: "kanban",
  selectedListTicketIds: [],
  sidebarCollapsed: localStorage.getItem("soloboard:sidebar-collapsed") === "true",
  filters: {
    q: "",
    lane: "",
    completed: "",
    label: "",
  },
  editingTicketId: null,
  activeLaneDragId: null,
  dialogMode: "view",
  skipDialogCloseSync: false,
  toastTimer: null,
  uxResolver: null,
  uxMode: "form",
  editorLabelIds: [],
  editorBlockerIds: [],
  editorChildIds: [],
  editorOriginalChildIds: [],
  labelQuery: "",
  blockerQuery: "",
  childQuery: "",
};

const elements = {
  shell: document.querySelector(".shell"),
  sidebar: document.querySelector("#sidebar"),
  boardList: document.querySelector("#board-list"),
  sidebarLabelSection: document.querySelector("#sidebar-label-section"),
  sidebarLabelList: document.querySelector("#sidebar-label-list"),
  newSidebarLabelButton: document.querySelector("#new-sidebar-label-button"),
  sidebarBoardSection: document.querySelector("#sidebar-board-section"),
  renameBoardButton: document.querySelector("#rename-board-button"),
  deleteBoardButton: document.querySelector("#delete-board-button"),
  boardTitle: document.querySelector("#board-title"),
  laneBoard: document.querySelector("#lane-board"),
  listBoard: document.querySelector("#list-board"),
  sidebarToggleButton: document.querySelector("#sidebar-toggle-button"),
  sidebarReopenButton: document.querySelector("#sidebar-reopen-button"),
  newBoardButton: document.querySelector("#new-board-button"),
  searchInput: document.querySelector("#search-input"),
  laneFilter: document.querySelector("#lane-filter"),
  viewModeButtons: [...document.querySelectorAll("#view-mode-toggle button")],
  completedFilter: document.querySelector("#completed-filter"),
  completedFilterButtons: [...document.querySelectorAll("#completed-filter button")],
  labelFilter: document.querySelector("#label-filter"),
  exportBoardButton: document.querySelector("#export-board-button"),
  importBoardInput: document.querySelector("#import-board-input"),
  editorDialog: document.querySelector("#editor-dialog"),
  ticketView: document.querySelector("#ticket-view"),
  editorForm: document.querySelector("#editor-form"),
  editorTitle: document.querySelector("#editor-title"),
  ticketViewId: document.querySelector("#ticket-view-id"),
  ticketViewTitle: document.querySelector("#ticket-view-title"),
  ticketViewMeta: document.querySelector("#ticket-view-meta"),
  ticketRelations: document.querySelector("#ticket-relations"),
  ticketViewBody: document.querySelector("#ticket-view-body"),
  ticketComments: document.querySelector("#ticket-comments"),
  commentForm: document.querySelector("#comment-form"),
  commentBody: document.querySelector("#comment-body"),
  saveCommentButton: document.querySelector("#save-comment-button"),
  editTicketButton: document.querySelector("#edit-ticket-button"),
  ticketTitle: document.querySelector("#ticket-title"),
  ticketLane: document.querySelector("#ticket-lane"),
  ticketParent: document.querySelector("#ticket-parent"),
  ticketPriority: document.querySelector("#ticket-priority"),
  ticketCompleted: document.querySelector("#ticket-completed"),
  ticketLabelToggle: document.querySelector("#ticket-label-toggle"),
  ticketLabelSummary: document.querySelector("#ticket-label-summary"),
  ticketLabelSearch: document.querySelector("#ticket-label-search"),
  ticketLabelOptions: document.querySelector("#ticket-label-options"),
  ticketBlockerToggle: document.querySelector("#ticket-blocker-toggle"),
  ticketBlockerSummary: document.querySelector("#ticket-blocker-summary"),
  ticketBlockerSearch: document.querySelector("#ticket-blocker-search"),
  ticketBlockerOptions: document.querySelector("#ticket-blocker-options"),
  ticketChildrenRow: document.querySelector("#ticket-children-row"),
  ticketChildToggle: document.querySelector("#ticket-child-toggle"),
  ticketChildSummary: document.querySelector("#ticket-child-summary"),
  ticketChildSearch: document.querySelector("#ticket-child-search"),
  ticketChildOptions: document.querySelector("#ticket-child-options"),
  ticketBody: document.querySelector("#ticket-body"),
  deleteTicketButton: document.querySelector("#delete-ticket-button"),
  ticketCompletedRow: document.querySelector("#ticket-completed-row"),
  cancelEditButton: document.querySelector("#cancel-edit-button"),
  closeDialogButton: document.querySelector("#close-dialog-button"),
  uxDialog: document.querySelector("#ux-dialog"),
  uxForm: document.querySelector("#ux-form"),
  uxTitle: document.querySelector("#ux-title"),
  uxMessage: document.querySelector("#ux-message"),
  uxFields: document.querySelector("#ux-fields"),
  uxError: document.querySelector("#ux-error"),
  uxSubmitButton: document.querySelector("#ux-submit-button"),
  uxDismissButton: document.querySelector("#ux-dismiss-button"),
  uxCancelButton: document.querySelector("#ux-cancel-button"),
  toast: document.querySelector("#toast"),
};

async function main() {
  bindEvents();
  syncSidebar();
  syncCompletedFilter("");
  syncViewMode();
  await refreshBoards();
  await applyRouteFromLocation({ replace: true });
}

function syncViewMode() {
  elements.viewModeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.viewMode === state.viewMode);
  });
  elements.laneBoard.hidden = state.viewMode !== "kanban";
  elements.listBoard.hidden = state.viewMode !== "list";
  elements.laneFilter.hidden = state.viewMode !== "list";
  syncListActionButtons();
}

function syncListActionButtons() {
  const disabled = state.selectedListTicketIds.length === 0;
  elements.listBoard.querySelectorAll(".list-action-button").forEach((button) => {
    button.disabled = disabled;
  });
}

function bindEvents() {
  elements.sidebarToggleButton.addEventListener("click", toggleSidebar);
  elements.sidebarReopenButton.addEventListener("click", toggleSidebar);
  elements.newBoardButton.addEventListener("click", createBoard);
  elements.newSidebarLabelButton.addEventListener("click", createLabel);
  elements.renameBoardButton.addEventListener("click", renameBoard);
  elements.deleteBoardButton.addEventListener("click", deleteBoard);
  elements.ticketLabelToggle.addEventListener("click", handleTicketTagFieldClick);
  elements.ticketLabelSearch.addEventListener("focus", openTicketLabelOptions);
  elements.ticketLabelSearch.addEventListener("input", handleTicketLabelSearchInput);
  elements.ticketLabelSearch.addEventListener("keydown", handleTicketLabelSearchKeydown);
  elements.ticketBlockerToggle.addEventListener("click", handleBlockerFieldClick);
  elements.ticketBlockerSearch.addEventListener("focus", openBlockerOptions);
  elements.ticketBlockerSearch.addEventListener("input", handleBlockerSearchInput);
  elements.ticketBlockerSearch.addEventListener("keydown", handleBlockerSearchKeydown);
  elements.ticketChildToggle.addEventListener("click", handleChildFieldClick);
  elements.ticketChildSearch.addEventListener("focus", openChildOptions);
  elements.ticketChildSearch.addEventListener("input", handleChildSearchInput);
  elements.ticketChildSearch.addEventListener("keydown", handleChildSearchKeydown);
  elements.ticketParent.addEventListener("change", handleParentChange);
  elements.viewModeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.viewMode = button.dataset.viewMode || "kanban";
      syncViewMode();
      renderBoardDetail();
      syncBoardUrl();
    });
  });
  elements.searchInput.addEventListener("input", async (event) => {
    state.filters.q = event.target.value.trim();
    await refreshBoardDetail();
  });
  elements.laneFilter.addEventListener("change", async (event) => {
    state.filters.lane = event.target.value;
    await refreshBoardDetail();
  });
  elements.completedFilterButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      state.filters.completed = button.dataset.value ?? "";
      syncCompletedFilter();
      await refreshBoardDetail();
    });
  });
  elements.labelFilter.addEventListener("change", async (event) => {
    state.filters.label = event.target.value;
    await refreshBoardDetail();
  });
  elements.editorForm.addEventListener("submit", saveTicket);
  elements.commentForm.addEventListener("submit", addComment);
  elements.saveCommentButton.addEventListener("click", addComment);
  elements.uxForm.addEventListener("submit", handleUxSubmit);
  elements.deleteTicketButton.addEventListener("click", deleteTicket);
  elements.editTicketButton.addEventListener("click", () => setDialogMode("edit"));
  elements.cancelEditButton.addEventListener("click", () => {
    if (state.editingTicketId) {
      setDialogMode("view");
      return;
    }
    closeEditor();
  });
  elements.closeDialogButton.addEventListener("click", closeEditor);
  elements.editorDialog.addEventListener("close", handleEditorDialogClose);
  elements.uxCancelButton.addEventListener("click", () => finishUxDialog(null));
  elements.uxDismissButton.addEventListener("click", () => finishUxDialog(null));
  elements.uxDialog.addEventListener("close", () => finishUxDialog(null));
  elements.exportBoardButton.addEventListener("click", exportBoard);
  elements.importBoardInput.addEventListener("change", importBoard);
  elements.laneBoard.addEventListener("dragover", handleLaneDragOver);
  window.addEventListener("popstate", () => {
    applyRouteFromLocation().catch((error) => {
      console.error(error);
      showToast(error.message, "error");
    });
  });
  document.addEventListener("click", handleDocumentClick);
}

async function refreshBoards() {
  const data = await api("/api/boards");
  state.boards = data.boards;
  if (!state.activeBoardId && state.boards.length > 0) {
    state.activeBoardId = state.boards[0].id;
  }
  renderBoards();
  await refreshBoardDetail();
}

function resetBoardFilters() {
  state.filters = { q: "", lane: "", completed: "", label: "" };
  elements.searchInput.value = "";
  elements.laneFilter.value = "";
  syncCompletedFilter("");
  elements.labelFilter.value = "";
}

async function selectBoard(boardId) {
  state.activeBoardId = boardId;
  resetBoardFilters();
  await refreshBoardDetail();
  syncBoardUrl();
}

async function refreshBoardDetail() {
  if (!state.activeBoardId) {
    closeBoardEvents();
    state.boardDetail = null;
    state.boardTickets = [];
    renderBoardDetail();
    return;
  }
  const detail = await api(`/api/boards/${state.activeBoardId}`);
  const allTickets = await api(`/api/boards/${state.activeBoardId}/tickets`);
  const hasFilters = Object.values(state.filters).some((value) => value !== "");
  const tickets = hasFilters
    ? await api(
        `/api/boards/${state.activeBoardId}/tickets?${new URLSearchParams(
          Object.entries(state.filters)
            .filter(([, value]) => value !== "")
            .map(([key, value]) => [key === "lane" ? "lane_id" : key, value]),
        ).toString()}`,
      )
    : allTickets;
  state.boardTickets = allTickets.tickets;
  state.boardDetail = {
    board: detail.board,
    lanes: detail.lanes,
    labels: detail.labels,
    tickets: tickets.tickets,
  };
  syncBoardEvents();
  renderBoards();
  renderBoardDetail();
}

function closeBoardEvents() {
  if (state.boardEvents) {
    state.boardEvents.close();
  }
  state.boardEvents = null;
  state.boardEventsBoardId = null;
}

function syncBoardEvents() {
  if (!state.activeBoardId) {
    closeBoardEvents();
    return;
  }
  if (state.boardEvents && state.boardEventsBoardId === state.activeBoardId) {
    return;
  }
  closeBoardEvents();
  const source = new EventSource(`/api/boards/${state.activeBoardId}/events`);
  source.onmessage = () => {
    handleBoardUpdatedEvent().catch((error) => {
      console.error(error);
    });
  };
  source.addEventListener("board_updated", handleBoardUpdatedEvent);
  source.addEventListener("board_imported", handleBoardUpdatedEvent);
  source.addEventListener("board_created", handleBoardUpdatedEvent);
  source.onerror = () => {
    if (state.boardEvents === source && source.readyState === EventSource.CLOSED) {
      closeBoardEvents();
    }
  };
  state.boardEvents = source;
  state.boardEventsBoardId = state.activeBoardId;
}

async function handleBoardUpdatedEvent() {
  if (state.viewMode !== "kanban" || elements.editorDialog.open || !state.activeBoardId) {
    return;
  }
  if (state.boardRefreshInFlight) {
    state.boardRefreshQueued = true;
    return;
  }
  state.boardRefreshInFlight = true;
  try {
    await refreshBoardDetail();
  } catch (error) {
    console.error(error);
  } finally {
    state.boardRefreshInFlight = false;
    if (state.boardRefreshQueued) {
      state.boardRefreshQueued = false;
      queueMicrotask(() => {
        handleBoardUpdatedEvent().catch((error) => {
          console.error(error);
        });
      });
    }
  }
}

function renderBoards() {
  elements.boardList.innerHTML = "";
  for (const board of state.boards) {
    const button = document.createElement("button");
    button.className = `board-button ${board.id === state.activeBoardId ? "active" : ""}`;
    button.textContent = board.name;
    button.addEventListener("click", async () => {
      await selectBoard(board.id);
    });
    elements.boardList.append(button);
  }
}

function renderBoardDetail() {
  const detail = state.boardDetail;
  if (!detail) {
    elements.boardTitle.textContent = "No board selected";
    elements.sidebarLabelSection.hidden = true;
    elements.sidebarBoardSection.hidden = true;
    elements.labelFilter.innerHTML = '<option value="">All labels</option>';
    elements.laneFilter.innerHTML = '<option value="">All lanes</option>';
    elements.laneBoard.className = "lane-board empty";
    elements.laneBoard.innerHTML = '<div class="empty-state"><p>Create a board to start tracking tasks.</p></div>';
    elements.listBoard.className = "list-board empty";
    elements.listBoard.innerHTML = '<div class="empty-state"><p>Create a board to start tracking tasks.</p></div>';
    state.selectedListTicketIds = [];
    syncViewMode();
    return;
  }

  elements.boardTitle.textContent = detail.board.name;
  elements.sidebarLabelSection.hidden = false;
  elements.sidebarBoardSection.hidden = false;
  renderSidebarLabels();
  elements.labelFilter.innerHTML =
    '<option value="">All labels</option>' +
    detail.labels
      .map(
        (label) =>
          `<option value="${escapeHtml(label.name)}" ${state.filters.label === label.name ? "selected" : ""}>${escapeHtml(label.name)}</option>`,
      )
      .join("");
  elements.laneFilter.innerHTML =
    '<option value="">All lanes</option>' +
    detail.lanes
      .map(
        (lane) =>
          `<option value="${lane.id}" ${state.filters.lane === String(lane.id) ? "selected" : ""}>${escapeHtml(lane.name)}</option>`,
      )
      .join("");

  renderKanbanBoard(detail);
  renderListBoard(detail);
  syncViewMode();
}

function renderKanbanBoard(detail) {
  elements.laneBoard.className = "lane-board";
  elements.laneBoard.innerHTML = "";

  for (const lane of detail.lanes.sort((a, b) => a.position - b.position)) {
    const laneTickets = detail.tickets.filter((item) => item.laneId === lane.id).sort((a, b) => a.position - b.position);
    const laneElement = document.createElement("section");
    laneElement.className = "lane";
    laneElement.dataset.laneId = String(lane.id);

    const header = document.createElement("div");
    header.className = "lane-header";
    header.innerHTML = `
      <div class="lane-title-row">
        <h3 class="lane-title" data-action="drag-lane" title="Drag to reorder">${escapeHtml(lane.name)}</h3>
        <span class="lane-count">${laneTickets.length}</span>
      </div>
      <div class="lane-actions">
        <button type="button" class="icon-button" data-action="rename-lane" title="Rename lane">✎</button>
        <button type="button" class="icon-button danger" data-action="delete-lane" title="Delete lane">×</button>
      </div>
    `;

    const list = document.createElement("div");
    list.className = "ticket-list";
    list.dataset.laneId = String(lane.id);
    bindDropZone(list);

    for (const ticket of laneTickets) {
      list.append(createTicketCard(ticket));
    }

    const addTicketButton = document.createElement("button");
    addTicketButton.type = "button";
    addTicketButton.className = "add-ticket-button icon-button";
    addTicketButton.textContent = "+";
    addTicketButton.title = "New ticket";
    addTicketButton.addEventListener("click", () => openEditor(null, "edit", lane.id));

    header.querySelector("[data-action='rename-lane']").addEventListener("click", () => renameLane(lane));
    header.querySelector("[data-action='delete-lane']").addEventListener("click", () => deleteLane(lane));
    bindLaneDrag(header.querySelector("[data-action='drag-lane']"), laneElement);

    laneElement.append(header, list, addTicketButton);
    elements.laneBoard.append(laneElement);
  }

  const addLaneButton = document.createElement("button");
  addLaneButton.type = "button";
  addLaneButton.className = "add-lane-button icon-button";
  addLaneButton.textContent = "+";
  addLaneButton.title = "New lane";
  addLaneButton.addEventListener("click", createLane);
  elements.laneBoard.append(addLaneButton);
}

function renderListBoard(detail) {
  state.selectedListTicketIds = state.selectedListTicketIds.filter((ticketId) => detail.tickets.some((ticket) => ticket.id === ticketId));
  if (detail.tickets.length === 0) {
    elements.listBoard.className = "list-board empty";
    elements.listBoard.innerHTML = '<div class="empty-state"><p>No tickets match the current filters.</p></div>';
    return;
  }
  elements.listBoard.className = "list-board";
  const orderedTickets = getListTickets(detail.tickets);
  const visibleTicketIds = orderedTickets.map(({ ticket }) => ticket.id);
  const allSelected = visibleTicketIds.length > 0 && visibleTicketIds.every((ticketId) => state.selectedListTicketIds.includes(ticketId));
  const doneButton = `<button type="button" class="list-action-button" data-bulk-complete="true" ${state.selectedListTicketIds.length === 0 ? "disabled" : ""}>Mark Done</button>`;
  const openButton = `<button type="button" class="list-action-button" data-bulk-complete="false" ${state.selectedListTicketIds.length === 0 ? "disabled" : ""}>Mark Open</button>`;
  elements.listBoard.innerHTML = `
    <div class="list-actions">${doneButton}${openButton}</div>
    <div class="list-header">
      <div><input type="checkbox" id="list-select-all" ${allSelected ? "checked" : ""} /></div>
      <div>ID / Title</div>
      <div>Blockers</div>
      <div>Labels</div>
      <div>Priority</div>
      <div>Status</div>
    </div>
    ${orderedTickets.map(renderListRow).join("")}
    <div class="list-actions">${doneButton}${openButton}</div>
  `;
  elements.listBoard.querySelectorAll("input[data-list-ticket-id]").forEach((input) => {
    input.addEventListener("change", handleListTicketSelection);
  });
  const selectAll = elements.listBoard.querySelector("#list-select-all");
  if (selectAll) {
    const selectedCount = visibleTicketIds.filter((ticketId) => state.selectedListTicketIds.includes(ticketId)).length;
    selectAll.indeterminate = selectedCount > 0 && selectedCount < visibleTicketIds.length;
    selectAll.addEventListener("change", (event) => {
      handleListSelectAll(event, visibleTicketIds);
    });
  }
  elements.listBoard.querySelectorAll("button[data-open-ticket-id]").forEach((button) => {
    button.addEventListener("click", () => openEditor(Number(button.dataset.openTicketId), "view"));
  });
  elements.listBoard.querySelectorAll(".list-action-button").forEach((button) => {
    button.addEventListener("click", async () => {
      await updateSelectedListTickets(button.dataset.bulkComplete === "true");
    });
  });
}

function getListTickets(tickets) {
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

function renderListRow(entry) {
  const { ticket, indent } = entry;
  const labels = ticket.labels
    .map((label) => `<span class="label" style="background:${escapeHtml(label.color)}">${escapeHtml(label.name)}</span>`)
    .join("");
  const blockedBy = ticket.blockers.length
    ? `blocked by ${ticket.blockers.map((blocker) => `#${blocker.id}`).join(", ")}`
    : "";
  const blocks = state.boardTickets
    .filter((candidate) => candidate.id !== ticket.id && candidate.blockerIds.includes(ticket.id))
    .map((candidate) => `#${candidate.id}`);
  const relations = [
    blockedBy,
    blocks.length ? `blocks ${blocks.join(", ")}` : "",
  ].filter(Boolean).join(" · ");
  const lane = state.boardDetail.lanes.find((item) => item.id === ticket.laneId);
  return `
    <label class="list-row ${ticket.isCompleted ? "completed" : ""}">
      <input type="checkbox" data-list-ticket-id="${ticket.id}" ${state.selectedListTicketIds.includes(ticket.id) ? "checked" : ""} />
      <button type="button" class="list-ticket-link indent-${indent}" data-open-ticket-id="${ticket.id}">
        <span class="ticket-id">#${ticket.id}</span>
        <span>${escapeHtml(ticket.title)}</span>
      </button>
      <div class="list-cell muted">${relations || "-"}</div>
      <div class="label-list">${labels || '<span class="muted">-</span>'}</div>
      <div class="list-cell">P${ticket.priority}</div>
      <div class="list-cell muted">${ticket.isCompleted ? "Done" : escapeHtml(lane?.name || "Open")}</div>
    </label>
  `;
}

async function updateSelectedListTickets(isCompleted) {
  const ticketIds = [...state.selectedListTicketIds];
  if (ticketIds.length === 0) {
    return;
  }
  for (const ticketId of ticketIds) {
    await sendJson(`/api/tickets/${ticketId}`, {
      method: "PATCH",
      body: { isCompleted },
    });
  }
  state.selectedListTicketIds = [];
  await refreshBoardDetail();
}

function handleListTicketSelection(event) {
  const ticketId = Number(event.target.dataset.listTicketId);
  if (event.target.checked) {
    state.selectedListTicketIds = [...new Set([...state.selectedListTicketIds, ticketId])];
  } else {
    state.selectedListTicketIds = state.selectedListTicketIds.filter((id) => id !== ticketId);
  }
  syncListActionButtons();
  syncListSelectAllState();
}

function handleListSelectAll(event, visibleTicketIds) {
  if (event.target.checked) {
    state.selectedListTicketIds = [...new Set([...state.selectedListTicketIds, ...visibleTicketIds])];
  } else {
    const visibleSet = new Set(visibleTicketIds);
    state.selectedListTicketIds = state.selectedListTicketIds.filter((ticketId) => !visibleSet.has(ticketId));
  }
  renderListBoard(state.boardDetail);
  syncListActionButtons();
}

function syncListSelectAllState() {
  const selectAll = elements.listBoard.querySelector("#list-select-all");
  if (!selectAll || !state.boardDetail) {
    return;
  }
  const visibleTicketIds = state.boardDetail.tickets.map((ticket) => ticket.id);
  const selectedCount = visibleTicketIds.filter((ticketId) => state.selectedListTicketIds.includes(ticketId)).length;
  selectAll.checked = visibleTicketIds.length > 0 && selectedCount === visibleTicketIds.length;
  selectAll.indeterminate = selectedCount > 0 && selectedCount < visibleTicketIds.length;
}

function createTicketCard(ticket) {
  const card = document.createElement("article");
  card.className = `ticket-card ${ticket.isCompleted ? "completed" : ""}`;
  card.draggable = true;
  card.dataset.ticketId = String(ticket.id);
  card.innerHTML = `
    <div class="ticket-head">
      <span class="ticket-id">#${ticket.id}</span>
      <button type="button" class="ticket-link">${escapeHtml(ticket.title)}</button>
    </div>
    <div class="label-list">
      ${ticket.labels.map((label) => `<span class="label" style="background:${escapeHtml(label.color)}">${escapeHtml(label.name)}</span>`).join("")}
    </div>
  `;

  const titleButton = card.querySelector(".ticket-link");
  titleButton.addEventListener("click", (event) => {
    event.stopPropagation();
    openEditor(ticket.id, "view");
  });
  card.addEventListener("dragstart", () => {
    card.classList.add("dragging");
  });
  card.addEventListener("dragend", () => {
    card.classList.remove("dragging");
  });
  return card;
}

function bindDropZone(list) {
  list.addEventListener("dragover", (event) => {
    event.preventDefault();
    const dragging = document.querySelector(".ticket-card.dragging");
    if (!dragging) {
      return;
    }
    const afterElement = getDragAfterElement(list, event.clientY);
    if (!afterElement) {
      list.append(dragging);
      return;
    }
    list.insertBefore(dragging, afterElement);
  });

  list.addEventListener("drop", async (event) => {
    if (!document.querySelector(".ticket-card.dragging")) {
      return;
    }
    event.preventDefault();
    await persistTicketOrder();
  });
}

function bindLaneDrag(handle, laneElement) {
  handle.draggable = true;
  handle.classList.add("lane-draggable");

  handle.addEventListener("dragstart", (event) => {
    state.activeLaneDragId = Number(laneElement.dataset.laneId);
    laneElement.classList.add("dragging-lane");
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", String(state.activeLaneDragId));
    }
  });

  handle.addEventListener("dragend", async () => {
    if (!laneElement.classList.contains("dragging-lane")) {
      return;
    }
    laneElement.classList.remove("dragging-lane");
    state.activeLaneDragId = null;
    await persistLaneOrder();
  });
}

function handleLaneDragOver(event) {
  const dragging =
    state.activeLaneDragId == null
      ? null
      : elements.laneBoard.querySelector(`.lane[data-lane-id="${state.activeLaneDragId}"]`);
  if (!dragging) {
    return;
  }
  if (event.target instanceof Element && event.target.closest(".ticket-list")) {
    return;
  }
  event.preventDefault();
  const afterElement = getLaneAfterElement(elements.laneBoard, event.clientX);
  if (!afterElement) {
    elements.laneBoard.append(dragging);
    return;
  }
  elements.laneBoard.insertBefore(dragging, afterElement);
}

async function persistTicketOrder() {
  if (!state.boardDetail) {
    return;
  }
  const items = [...document.querySelectorAll(".ticket-list")].flatMap((list) =>
    [...list.children].map((card, index) => ({
      ticketId: Number(card.dataset.ticketId),
      laneId: Number(list.dataset.laneId),
      position: index,
    })),
  );
  await api(`/api/boards/${state.activeBoardId}/tickets/reorder`, {
    method: "POST",
    body: JSON.stringify({ items }),
  });
  await refreshBoardDetail();
}

async function persistLaneOrder() {
  if (!state.boardDetail) {
    return;
  }
  const laneIds = [...elements.laneBoard.querySelectorAll(".lane")].map((lane) => Number(lane.dataset.laneId));
  await api(`/api/boards/${state.activeBoardId}/lanes/reorder`, {
    method: "POST",
    body: JSON.stringify({ laneIds }),
  });
  await refreshBoardDetail();
}

async function createBoard() {
  const values = await requestFields({
    title: "New Board",
    submitLabel: "Create",
    fields: [
      { id: "name", label: "Board name", value: "", required: true },
    ],
  });
  if (!values) {
    return;
  }
  const created = await sendJson("/api/boards", {
    method: "POST",
    body: { name: values.name },
  });
  state.activeBoardId = created.board.id;
  await refreshBoards();
  syncBoardUrl();
}

async function createLane() {
  if (!state.activeBoardId) {
    return;
  }
  const values = await requestFields({
    title: "New Lane",
    submitLabel: "Create",
    fields: [
      { id: "name", label: "Lane name", value: "", required: true },
    ],
  });
  if (!values) {
    return;
  }
  await sendJson(`/api/boards/${state.activeBoardId}/lanes`, {
    method: "POST",
    body: { name: values.name },
  });
  await refreshBoardDetail();
}

async function renameBoard() {
  if (!state.boardDetail) {
    return;
  }
  const values = await requestFields({
    title: "Rename Board",
    submitLabel: "Save",
    fields: [
      { id: "name", label: "Board name", value: state.boardDetail.board.name, required: true },
    ],
  });
  if (!values) {
    return;
  }
  await sendJson(`/api/boards/${state.activeBoardId}`, {
    method: "PATCH",
    body: { name: values.name },
  });
  await refreshBoards();
}

async function deleteBoard() {
  if (!state.boardDetail) {
    return;
  }
  const board = state.boardDetail.board;
  const nextBoard = state.boards.find((entry) => entry.id !== board.id) ?? null;
  await confirmAndRun({
    title: "Delete Board",
    message: `Delete board "${board.name}" and all of its tickets?`,
    submitLabel: "Delete",
    run: async () => {
      await api(`/api/boards/${board.id}`, { method: "DELETE" });
      state.activeBoardId = nextBoard?.id ?? null;
      await refreshBoards();
      syncBoardUrl();
    },
  });
}

async function createLabel() {
  if (!state.activeBoardId) {
    return;
  }
  const values = await requestFields({
    title: "New Label",
    submitLabel: "Create",
    fields: [
      { id: "name", label: "Label name", value: "", required: true },
      { id: "color", label: "Color", value: "#1f6f5f", required: true, type: "color" },
    ],
  });
  if (!values) {
    return;
  }
  const created = await sendJson(`/api/boards/${state.activeBoardId}/labels`, {
    method: "POST",
    body: { name: values.name, color: values.color },
  });
  await refreshBoardDetail();
  state.editorLabelIds = [...new Set([...state.editorLabelIds, created.id])];
  syncTicketLabelOptions();
}

function renderSidebarLabels() {
  const labels = state.boardDetail?.labels ?? [];
  if (labels.length === 0) {
    elements.sidebarLabelList.innerHTML = '<p class="label-manager-empty muted">No labels yet.</p>';
    return;
  }

  elements.sidebarLabelList.innerHTML = "";
  for (const label of labels) {
    const row = document.createElement("div");
    row.className = "label-manager-row";
    row.innerHTML = `
      <input type="text" value="${escapeHtml(label.name)}" aria-label="Label name" />
      <input type="color" value="${escapeHtml(label.color)}" aria-label="Label color" />
      <button type="button" class="icon-button" title="Save label">✓</button>
      <button type="button" class="icon-button danger" title="Delete label">×</button>
    `;

    const nameInput = row.querySelector('input[type="text"]');
    const colorInput = row.querySelector('input[type="color"]');
    const saveButton = row.querySelector('button[title="Save label"]');
    const deleteButton = row.querySelector('button[title="Delete label"]');

    saveButton.addEventListener("click", async () => {
      const name = nameInput.value.trim();
      if (!name) {
        showToast("Label name is required", "error");
        nameInput.focus();
        return;
      }
      try {
        await sendJson(`/api/labels/${label.id}`, {
          method: "PATCH",
          body: { name, color: colorInput.value },
        });
        await refreshBoardDetail();
        syncTicketLabelOptions();
        renderSidebarLabels();
        showToast("Label updated");
      } catch (error) {
        showToast(error.message, "error");
      }
    });

    deleteButton.addEventListener("click", async () => {
      const deleted = await confirmAndRun({
        title: "Delete Label",
        message: `Delete label "${label.name}"?`,
        submitLabel: "Delete",
        run: async () => {
          await api(`/api/labels/${label.id}`, { method: "DELETE" });
          await refreshBoardDetail();
          syncTicketLabelOptions();
        },
      });
      if (deleted) {
        renderSidebarLabels();
      }
    });

    elements.sidebarLabelList.append(row);
  }
}

async function renameLane(lane) {
  const values = await requestFields({
    title: "Rename Lane",
    submitLabel: "Save",
    fields: [
      { id: "name", label: "Lane name", value: lane.name, required: true },
    ],
  });
  if (!values) {
    return;
  }
  await sendJson(`/api/lanes/${lane.id}`, {
    method: "PATCH",
    body: { name: values.name },
  });
  await refreshBoardDetail();
}

async function deleteLane(lane) {
  await confirmAndRun({
    title: "Delete Lane",
    message: `Delete lane "${lane.name}"? Empty lanes only.`,
    submitLabel: "Delete",
    run: async () => {
      await api(`/api/lanes/${lane.id}`, { method: "DELETE" });
      await refreshBoardDetail();
    },
  });
}

async function openEditor(ticketId = null, mode = "edit", defaultLaneId = null) {
  if (!state.boardDetail) {
    return;
  }
  state.editingTicketId = ticketId;
  const ticket = ticketId ? await api(`/api/tickets/${ticketId}`) : null;
  elements.editorTitle.textContent = ticketId ? "Ticket" : "New Ticket";
  elements.ticketTitle.value = ticket?.title ?? "";
  elements.ticketPriority.value = String(ticket?.priority ?? 0);
  elements.ticketCompleted.checked = ticket?.isCompleted ?? false;
  elements.ticketBody.value = ticket?.bodyMarkdown ?? "";
  elements.ticketViewId.textContent = ticket ? `#${ticket.id}` : "";
  elements.ticketViewTitle.textContent = ticket?.title ?? "";
  elements.ticketViewMeta.innerHTML = renderTicketMeta(ticket);
  elements.ticketRelations.innerHTML = renderTicketRelations(ticket);
  elements.ticketViewBody.innerHTML = ticket?.bodyHtml ?? '<p class="muted">No description</p>';
  elements.ticketComments.innerHTML = renderComments(ticket?.comments ?? []);
  elements.commentBody.value = "";
  const selectedLaneId = ticket?.laneId ?? defaultLaneId;
  elements.ticketLane.innerHTML = state.boardDetail.lanes
    .map((lane) => `<option value="${lane.id}" ${selectedLaneId === lane.id ? "selected" : ""}>${escapeHtml(lane.name)}</option>`)
    .join("");
  const selectableParents = getBoardTickets().filter((entry) => entry.id !== ticketId && entry.parentTicketId == null);
  elements.ticketParent.innerHTML =
    '<option value="">No parent</option>' +
    selectableParents
      .map(
        (entry) =>
          `<option value="${entry.id}" ${ticket?.parentTicketId === entry.id ? "selected" : ""}>#${entry.id} P${entry.priority} ${escapeHtml(entry.title)}</option>`,
      )
      .join("");
  elements.deleteTicketButton.hidden = !ticketId;
  elements.editTicketButton.hidden = !ticketId;
  elements.commentForm.hidden = !ticketId;
  elements.ticketCompletedRow.hidden = !ticketId;
  if (!ticketId && defaultLaneId != null) {
    elements.ticketLane.value = String(defaultLaneId);
  }
  state.editorLabelIds = ticket?.labels.map((entry) => entry.id) ?? [];
  state.editorBlockerIds = ticket?.blockerIds ?? [];
  state.editorChildIds = ticket?.children.map((entry) => entry.id) ?? [];
  state.editorOriginalChildIds = [...state.editorChildIds];
  state.labelQuery = "";
  state.blockerQuery = "";
  state.childQuery = "";
  elements.ticketLabelSearch.value = "";
  elements.ticketBlockerSearch.value = "";
  elements.ticketChildSearch.value = "";
  elements.ticketChildrenRow.hidden = !ticketId;
  syncTicketLabelOptions();
  syncBlockerOptions();
  syncChildPickerAvailability();
  syncChildOptions();
  setDialogMode(ticketId ? mode : "edit");
  elements.editorDialog.showModal();
  if (ticketId) {
    syncTicketUrl(ticketId);
  }
}

async function saveTicket(event) {
  event.preventDefault();
  if (!state.activeBoardId) {
    return;
  }
  const labelIds = getSelectedLabelIds();
  const blockerIds = [...state.editorBlockerIds];
  const nextParentTicketId = elements.ticketParent.value ? Number(elements.ticketParent.value) : null;
  const payload = {
    title: elements.ticketTitle.value.trim(),
    laneId: Number(elements.ticketLane.value),
    parentTicketId: nextParentTicketId,
    priority: Number(elements.ticketPriority.value || 0),
    isCompleted: elements.ticketCompleted.checked,
    bodyMarkdown: elements.ticketBody.value,
    labelIds,
    blockerIds,
  };
  const endpoint = state.editingTicketId
    ? `/api/tickets/${state.editingTicketId}`
    : `/api/boards/${state.activeBoardId}/tickets`;
  const method = state.editingTicketId ? "PATCH" : "POST";
  const editingTicketId = state.editingTicketId;
  if (editingTicketId && nextParentTicketId != null && state.editorOriginalChildIds.length > 0) {
    for (const childId of state.editorOriginalChildIds) {
      await sendJson(`/api/tickets/${childId}`, {
        method: "PATCH",
        body: { parentTicketId: null },
      });
    }
  }
  await api(endpoint, {
    method,
    body: JSON.stringify(payload),
  });
  if (editingTicketId) {
    if (nextParentTicketId == null) {
      const originalChildIds = new Set(state.editorOriginalChildIds);
      const nextChildIds = new Set(state.editorChildIds);
      for (const childId of state.editorOriginalChildIds) {
        if (!nextChildIds.has(childId)) {
          await sendJson(`/api/tickets/${childId}`, {
            method: "PATCH",
            body: { parentTicketId: null },
          });
        }
      }
      for (const childId of state.editorChildIds) {
        if (!originalChildIds.has(childId)) {
          await sendJson(`/api/tickets/${childId}`, {
            method: "PATCH",
            body: { parentTicketId: editingTicketId },
          });
        }
      }
    }
    const updated = await api(`/api/tickets/${editingTicketId}`);
    hydrateDialogTicket(updated);
    state.editorOriginalChildIds = [...state.editorChildIds];
    setDialogMode("view");
  } else {
    closeEditor();
  }
  await refreshBoardDetail();
}

async function deleteTicket() {
  if (!state.editingTicketId) {
    return;
  }
  const ticketId = state.editingTicketId;
  await confirmAndRun({
    title: "Delete Ticket",
    message: "Delete this ticket?",
    submitLabel: "Delete",
    run: async () => {
      await api(`/api/tickets/${ticketId}`, { method: "DELETE" });
      closeEditor();
      await refreshBoardDetail();
    },
  });
}

async function addComment(event) {
  event?.preventDefault?.();
  if (!state.editingTicketId) {
    return;
  }
  const bodyMarkdown = elements.commentBody.value.trim();
  if (!bodyMarkdown) {
    showToast("Comment is required", "error");
    return;
  }
  try {
    elements.saveCommentButton.disabled = true;
    await sendJson(`/api/tickets/${state.editingTicketId}/comments`, {
      method: "POST",
      body: { bodyMarkdown },
    });
    const ticket = await api(`/api/tickets/${state.editingTicketId}`);
    hydrateDialogTicket(ticket);
    elements.commentBody.value = "";
    await refreshBoardDetail();
    showToast("Comment added");
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    elements.saveCommentButton.disabled = false;
  }
}

async function exportBoard() {
  if (!state.activeBoardId) {
    return;
  }
  const payload = await api(`/api/boards/${state.activeBoardId}/export`);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${payload.board.name.replace(/\s+/g, "-").toLowerCase() || "board"}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function importBoard(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }
  const payload = JSON.parse(await file.text());
  const imported = await api("/api/boards/import", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  state.activeBoardId = imported.board.id;
  event.target.value = "";
  await refreshBoards();
  syncBoardUrl();
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll(".ticket-card:not(.dragging)")];
  return draggableElements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      }
      return closest;
    },
    { offset: Number.NEGATIVE_INFINITY, element: null },
  ).element;
}

function getLaneAfterElement(container, x) {
  const lanes = [...container.querySelectorAll(".lane:not(.dragging-lane)")];
  return lanes.reduce(
    (closest, lane) => {
      const box = lane.getBoundingClientRect();
      const offset = x - box.left - box.width / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: lane };
      }
      return closest;
    },
    { offset: Number.NEGATIVE_INFINITY, element: null },
  ).element;
}

function setDialogMode(mode) {
  state.dialogMode = mode;
  elements.ticketView.hidden = mode !== "view";
  elements.editorForm.hidden = mode !== "edit";
  if (mode !== "edit") {
    closeTicketLabelOptions();
    closeBlockerOptions();
    closeChildOptions();
  }
}

function resetDialogState() {
  state.editingTicketId = null;
  state.dialogMode = "view";
  state.editorLabelIds = [];
  state.editorBlockerIds = [];
  state.editorChildIds = [];
  state.editorOriginalChildIds = [];
  state.labelQuery = "";
  state.blockerQuery = "";
  state.childQuery = "";
}

function handleEditorDialogClose() {
  const shouldSync = !state.skipDialogCloseSync && window.location.pathname.startsWith("/tickets/");
  resetDialogState();
  state.skipDialogCloseSync = false;
  if (shouldSync) {
    syncBoardUrl();
  }
}

function closeEditor() {
  if (elements.editorDialog.open) {
    elements.editorDialog.close();
  }
  closeTicketLabelOptions();
  closeBlockerOptions();
  closeChildOptions();
  syncBoardUrl();
}

function toggleSidebar() {
  state.sidebarCollapsed = !state.sidebarCollapsed;
  localStorage.setItem("soloboard:sidebar-collapsed", String(state.sidebarCollapsed));
  syncSidebar();
}

function syncSidebar() {
  elements.shell.classList.toggle("sidebar-collapsed", state.sidebarCollapsed);
  elements.sidebarReopenButton.hidden = !state.sidebarCollapsed;
  elements.sidebarToggleButton.textContent = state.sidebarCollapsed ? "☰" : "⟨";
}

function readRouteFromLocation() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  const [kind, rawId, rawView] = parts;
  const id = Number(rawId);
  if (kind === "boards" && Number.isInteger(id) && id > 0) {
    return { kind: "board", id, viewMode: rawView === "list" ? "list" : "kanban" };
  }
  if (kind === "tickets" && Number.isInteger(id) && id > 0) {
    return { kind: "ticket", id };
  }
  return { kind: "home" };
}

async function applyRouteFromLocation({ replace = false } = {}) {
  const route = readRouteFromLocation();

  if (route.kind === "ticket") {
    try {
      const ticket = await api(`/api/tickets/${route.id}`);
      state.activeBoardId = ticket.boardId;
      resetBoardFilters();
      await refreshBoardDetail();
      await openEditor(ticket.id, "view");
      if (replace) {
        syncTicketUrl(ticket.id, { replace: true });
      }
      return;
    } catch {
      showToast("Ticket not found", "error");
    }
  }

  if (route.kind === "board") {
    if (state.boards.some((board) => board.id === route.id)) {
      state.activeBoardId = route.id;
      state.viewMode = route.viewMode;
      resetBoardFilters();
      await refreshBoardDetail();
      if (elements.editorDialog.open) {
        state.skipDialogCloseSync = true;
        elements.editorDialog.close();
      }
      if (replace) {
        syncBoardUrl(true);
      }
      return;
    }
    showToast("Board not found", "error");
  }

  if (state.boards.length > 0) {
    state.activeBoardId =
      state.activeBoardId && state.boards.some((board) => board.id === state.activeBoardId)
        ? state.activeBoardId
        : state.boards[0].id;
    resetBoardFilters();
    await refreshBoardDetail();
    if (elements.editorDialog.open) {
      state.skipDialogCloseSync = true;
      elements.editorDialog.close();
    }
    syncBoardUrl(replace);
    return;
  }

  state.activeBoardId = null;
  await refreshBoardDetail();
}

function setUrl(pathname, { replace = false } = {}) {
  if (window.location.pathname === pathname) {
    return;
  }
  const method = replace ? "replaceState" : "pushState";
  window.history[method](null, "", pathname);
}

function syncBoardUrl(replace = false) {
  const pathname = !state.activeBoardId
    ? "/"
    : state.viewMode === "list"
      ? `/boards/${state.activeBoardId}/list`
      : `/boards/${state.activeBoardId}`;
  setUrl(pathname, { replace });
}

function syncTicketUrl(ticketId, { replace = false } = {}) {
  setUrl(`/tickets/${ticketId}`, { replace });
}

function handleUxSubmit(event) {
  event.preventDefault();
  if (state.uxMode === "confirm") {
    finishUxDialog(true);
    return;
  }
  const fields = [...elements.uxFields.querySelectorAll("[data-field-id]")];
  const values = Object.fromEntries(
    fields.map((input) => [input.dataset.fieldId, input.value.trim()]),
  );
  const missing = fields.find((input) => input.required && !input.value.trim());
  if (missing) {
    const label = missing.closest("label")?.childNodes?.[0]?.textContent?.trim() ?? "Field";
    elements.uxError.hidden = false;
    elements.uxError.textContent = `${label} is required`;
    return;
  }
  finishUxDialog(values);
}

function finishUxDialog(value) {
  const resolver = state.uxResolver;
  if (!resolver) {
    return;
  }
  state.uxResolver = null;
  if (elements.uxDialog.open) {
    elements.uxDialog.close();
  }
  resolver(value);
}

function requestFields(config) {
  return openUxDialog(config);
}

async function sendJson(url, { method, body }) {
  return api(url, {
    method,
    body: JSON.stringify(body),
  });
}

function getSelectedLabelIds() {
  return [...state.editorLabelIds];
}

function getBoardTickets() {
  return state.boardTickets ?? [];
}

function getTicketById(ticketId) {
  return getBoardTickets().find((ticket) => ticket.id === ticketId) ?? null;
}

function formatTicketChoice(ticket) {
  return `#${ticket.id} P${ticket.priority} ${ticket.title}`;
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

function renderLabelSummaryChip(label) {
  return `<button type="button" class="ticket-tag-chip" data-remove-label-id="${label.id}" style="background:${escapeHtml(label.color)}" title="Remove ${escapeHtml(label.name)}">${escapeHtml(label.name)} <span aria-hidden="true">×</span></button>`;
}

function renderTicketSummaryChip(ticket, removeAttr) {
  return `<button type="button" class="ticket-tag-chip ticket-ref-chip" ${removeAttr}="${ticket.id}" title="Remove ${escapeHtml(formatTicketChoice(ticket))}"><span class="ticket-ref-chip-id">#${ticket.id}</span><span class="ticket-ref-chip-text">${escapeHtml(ticket.title)}</span><span aria-hidden="true">×</span></button>`;
}

function renderTicketOption(ticket, attrName, isSelected) {
  return `
    <button type="button" class="label-picker-item ${isSelected ? "selected" : ""}" ${attrName}="${ticket.id}" role="option" aria-selected="${isSelected}">
      <span class="ticket-picker-id">#${ticket.id}</span>
      <span class="label-picker-text">${escapeHtml(ticket.title)}</span>
      <span class="ticket-picker-meta">P${ticket.priority}${ticket.isCompleted ? " Done" : ""}</span>
    </button>
  `;
}

function syncTicketLabelOptions() {
  if (!state.boardDetail) {
    return;
  }
  const availableLabelIds = new Set(state.boardDetail.labels.map((label) => label.id));
  state.editorLabelIds = state.editorLabelIds.filter((id) => availableLabelIds.has(id));
  const selectedLabels = state.boardDetail.labels.filter((label) => state.editorLabelIds.includes(label.id));
  elements.ticketLabelSummary.innerHTML = selectedLabels.length
    ? selectedLabels.map(renderLabelSummaryChip).join("")
    : '<span class="ticket-tag-placeholder">Add tags</span>';

  if (state.boardDetail.labels.length === 0) {
    elements.ticketLabelOptions.innerHTML = '<div class="label-picker-empty">No labels</div>';
    return;
  }

  const query = state.labelQuery.trim().toLowerCase();
  const visibleLabels = state.boardDetail.labels.filter((label) => {
    if (state.editorLabelIds.includes(label.id)) {
      return true;
    }
    if (!query) {
      return true;
    }
    return label.name.toLowerCase().includes(query);
  });

  elements.ticketLabelOptions.innerHTML = visibleLabels.length
    ? visibleLabels
        .map((label) => {
          const isSelected = state.editorLabelIds.includes(label.id);
          return `
            <button type="button" class="label-picker-item ${isSelected ? "selected" : ""}" data-label-id="${label.id}" role="option" aria-selected="${isSelected}">
              <span class="label-picker-swatch" style="background:${escapeHtml(label.color)}"></span>
              <span class="label-picker-text">${escapeHtml(label.name)}</span>
              <span class="label-picker-check" aria-hidden="true">${isSelected ? "✓" : ""}</span>
            </button>
          `;
        })
        .join("")
    : '<div class="label-picker-empty">No matching labels</div>';
}

function getAvailableBlockerTickets() {
  const currentId = state.editingTicketId;
  return getBoardTickets()
    .filter((ticket) => ticket.id !== currentId)
    .filter((ticket) => currentId == null || !ticket.blockerIds.includes(currentId))
    .sort((a, b) => b.priority - a.priority || a.id - b.id);
}

function syncBlockerOptions() {
  const selectedTickets = state.editorBlockerIds.map(getTicketById).filter(Boolean);
  elements.ticketBlockerSummary.innerHTML = selectedTickets.length
    ? selectedTickets.map((ticket) => renderTicketSummaryChip(ticket, 'data-remove-blocker-id')).join("")
    : '<span class="ticket-tag-placeholder">Add blockers</span>';

  const visibleTickets = getAvailableBlockerTickets().filter((ticket) => {
    if (state.editorBlockerIds.includes(ticket.id)) {
      return true;
    }
    return matchTicketQuery(ticket, state.blockerQuery);
  });

  elements.ticketBlockerOptions.innerHTML = visibleTickets.length
    ? visibleTickets.map((ticket) => renderTicketOption(ticket, 'data-blocker-id', state.editorBlockerIds.includes(ticket.id))).join("")
    : '<div class="label-picker-empty">No matching tickets</div>';
}

function openBlockerOptions() {
  closeTicketLabelOptions();
  closeChildOptions();
  elements.ticketBlockerOptions.hidden = false;
  elements.ticketBlockerToggle.setAttribute("aria-expanded", "true");
}

function closeBlockerOptions() {
  elements.ticketBlockerOptions.hidden = true;
  elements.ticketBlockerToggle.setAttribute("aria-expanded", "false");
}

function handleBlockerFieldClick(event) {
  const removeButton = event.target.closest("[data-remove-blocker-id]");
  if (removeButton) {
    event.preventDefault();
    toggleBlocker(Number(removeButton.dataset.removeBlockerId));
    return;
  }
  openBlockerOptions();
  elements.ticketBlockerSearch.focus();
}

function handleBlockerSearchInput(event) {
  state.blockerQuery = event.target.value;
  openBlockerOptions();
  syncBlockerOptions();
}

function handleBlockerSearchKeydown(event) {
  if (event.key === "Backspace" && !elements.ticketBlockerSearch.value && state.editorBlockerIds.length > 0) {
    event.preventDefault();
    state.editorBlockerIds = state.editorBlockerIds.slice(0, -1);
    syncBlockerOptions();
    return;
  }
  if (event.key === "Enter") {
    const firstOption = elements.ticketBlockerOptions.querySelector("[data-blocker-id]");
    if (firstOption) {
      event.preventDefault();
      toggleBlocker(Number(firstOption.dataset.blockerId));
    }
    return;
  }
  if (event.key === "Escape") {
    closeBlockerOptions();
    elements.ticketBlockerSearch.blur();
  }
}

function toggleBlocker(ticketId) {
  if (state.editorBlockerIds.includes(ticketId)) {
    state.editorBlockerIds = state.editorBlockerIds.filter((id) => id !== ticketId);
  } else {
    state.editorBlockerIds = [...state.editorBlockerIds, ticketId];
  }
  state.blockerQuery = "";
  elements.ticketBlockerSearch.value = "";
  syncBlockerOptions();
  openBlockerOptions();
  elements.ticketBlockerSearch.focus();
}

function getAvailableChildTickets() {
  if (!state.editingTicketId || elements.ticketParent.value) {
    return [];
  }
  return getBoardTickets()
    .filter((ticket) => ticket.id !== state.editingTicketId)
    .filter((ticket) => state.editorChildIds.includes(ticket.id) || (ticket.parentTicketId == null && ticket.children.length === 0))
    .sort((a, b) => b.priority - a.priority || a.id - b.id);
}

function syncChildPickerAvailability() {
  const canEditChildren = Boolean(state.editingTicketId) && !elements.ticketParent.value;
  elements.ticketChildrenRow.hidden = !state.editingTicketId;
  elements.ticketChildSearch.disabled = !canEditChildren;
  elements.ticketChildToggle.classList.toggle("is-disabled", !canEditChildren);
  if (!canEditChildren) {
    closeChildOptions();
    if (elements.ticketParent.value) {
      state.editorChildIds = [];
    }
  }
}

function syncChildOptions() {
  const selectedTickets = state.editorChildIds.map(getTicketById).filter(Boolean);
  elements.ticketChildSummary.innerHTML = selectedTickets.length
    ? selectedTickets.map((ticket) => renderTicketSummaryChip(ticket, 'data-remove-child-id')).join("")
    : `<span class="ticket-tag-placeholder">${state.editingTicketId ? (elements.ticketParent.value ? "Clear parent to edit children" : "Add children") : "Save ticket first"}</span>`;

  if (!state.editingTicketId || elements.ticketParent.value) {
    elements.ticketChildOptions.innerHTML = '<div class="label-picker-empty">Children cannot be edited while this ticket has a parent</div>';
    return;
  }

  const visibleTickets = getAvailableChildTickets().filter((ticket) => {
    if (state.editorChildIds.includes(ticket.id)) {
      return true;
    }
    return matchTicketQuery(ticket, state.childQuery);
  });

  elements.ticketChildOptions.innerHTML = visibleTickets.length
    ? visibleTickets.map((ticket) => renderTicketOption(ticket, 'data-child-id', state.editorChildIds.includes(ticket.id))).join("")
    : '<div class="label-picker-empty">No matching tickets</div>';
}

function openChildOptions() {
  if (!state.editingTicketId || elements.ticketParent.value) {
    return;
  }
  closeTicketLabelOptions();
  closeBlockerOptions();
  elements.ticketChildOptions.hidden = false;
  elements.ticketChildToggle.setAttribute("aria-expanded", "true");
}

function closeChildOptions() {
  elements.ticketChildOptions.hidden = true;
  elements.ticketChildToggle.setAttribute("aria-expanded", "false");
}

function handleChildFieldClick(event) {
  const removeButton = event.target.closest("[data-remove-child-id]");
  if (removeButton) {
    event.preventDefault();
    toggleChild(Number(removeButton.dataset.removeChildId));
    return;
  }
  openChildOptions();
  elements.ticketChildSearch.focus();
}

function handleChildSearchInput(event) {
  state.childQuery = event.target.value;
  openChildOptions();
  syncChildOptions();
}

function handleChildSearchKeydown(event) {
  if (event.key === "Backspace" && !elements.ticketChildSearch.value && state.editorChildIds.length > 0) {
    event.preventDefault();
    state.editorChildIds = state.editorChildIds.slice(0, -1);
    syncChildOptions();
    return;
  }
  if (event.key === "Enter") {
    const firstOption = elements.ticketChildOptions.querySelector("[data-child-id]");
    if (firstOption) {
      event.preventDefault();
      toggleChild(Number(firstOption.dataset.childId));
    }
    return;
  }
  if (event.key === "Escape") {
    closeChildOptions();
    elements.ticketChildSearch.blur();
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
  syncChildOptions();
  openChildOptions();
  elements.ticketChildSearch.focus();
}

function handleParentChange() {
  syncChildPickerAvailability();
  syncChildOptions();
}

function openTicketLabelOptions() {
  closeBlockerOptions();
  closeChildOptions();
  elements.ticketLabelOptions.hidden = false;
  elements.ticketLabelToggle.setAttribute("aria-expanded", "true");
}

function closeTicketLabelOptions() {
  elements.ticketLabelOptions.hidden = true;
  elements.ticketLabelToggle.setAttribute("aria-expanded", "false");
}

function handleTicketTagFieldClick(event) {
  const removeButton = event.target.closest("[data-remove-label-id]");
  if (removeButton) {
    event.preventDefault();
    toggleTicketLabel(Number(removeButton.dataset.removeLabelId));
    return;
  }
  openTicketLabelOptions();
  elements.ticketLabelSearch.focus();
}

function handleTicketLabelSearchInput(event) {
  state.labelQuery = event.target.value;
  openTicketLabelOptions();
  syncTicketLabelOptions();
}

function handleTicketLabelSearchKeydown(event) {
  if (event.key === "Backspace" && !elements.ticketLabelSearch.value && state.editorLabelIds.length > 0) {
    event.preventDefault();
    state.editorLabelIds = state.editorLabelIds.slice(0, -1);
    syncTicketLabelOptions();
    return;
  }
  if (event.key === "Enter") {
    const firstOption = elements.ticketLabelOptions.querySelector("[data-label-id]");
    if (firstOption) {
      event.preventDefault();
      toggleTicketLabel(Number(firstOption.dataset.labelId));
    }
    return;
  }
  if (event.key === "Escape") {
    closeTicketLabelOptions();
    elements.ticketLabelSearch.blur();
  }
}

function toggleTicketLabel(labelId) {
  if (state.editorLabelIds.includes(labelId)) {
    state.editorLabelIds = state.editorLabelIds.filter((id) => id !== labelId);
  } else {
    state.editorLabelIds = [...state.editorLabelIds, labelId];
  }
  state.labelQuery = "";
  elements.ticketLabelSearch.value = "";
  syncTicketLabelOptions();
  openTicketLabelOptions();
  elements.ticketLabelSearch.focus();
}

function handleDocumentClick(event) {
  if (!elements.editorDialog.open) {
    return;
  }
  const labelOption = event.target.closest?.("[data-label-id]");
  if (labelOption && elements.ticketLabelOptions.contains(labelOption)) {
    toggleTicketLabel(Number(labelOption.dataset.labelId));
    return;
  }
  const blockerOption = event.target.closest?.("[data-blocker-id]");
  if (blockerOption && elements.ticketBlockerOptions.contains(blockerOption)) {
    toggleBlocker(Number(blockerOption.dataset.blockerId));
    return;
  }
  const childOption = event.target.closest?.("[data-child-id]");
  if (childOption && elements.ticketChildOptions.contains(childOption)) {
    toggleChild(Number(childOption.dataset.childId));
    return;
  }
  if (
    elements.ticketLabelToggle.contains(event.target) ||
    elements.ticketLabelOptions.contains(event.target) ||
    elements.ticketBlockerToggle.contains(event.target) ||
    elements.ticketBlockerOptions.contains(event.target) ||
    elements.ticketChildToggle.contains(event.target) ||
    elements.ticketChildOptions.contains(event.target)
  ) {
    return;
  }
  closeTicketLabelOptions();
  closeBlockerOptions();
  closeChildOptions();
}

async function confirmAndRun({ title, message, submitLabel, run }) {
  const confirmed = await openConfirmDialog({ title, message, submitLabel });
  if (!confirmed) {
    return false;
  }
  try {
    await run();
    return true;
  } catch (error) {
    showToast(error.message, "error");
    return false;
  }
}

function openUxDialog({ title, message = "", submitLabel, fields }) {
  return new Promise((resolve) => {
    state.uxResolver = resolve;
    state.uxMode = "form";
    elements.uxTitle.textContent = title;
    elements.uxMessage.hidden = !message;
    elements.uxMessage.textContent = message;
    elements.uxSubmitButton.textContent = submitLabel;
    elements.uxError.hidden = true;
    elements.uxError.textContent = "";
    elements.uxFields.innerHTML = fields
      .map(
        (field) => `
          <label>
            ${escapeHtml(field.label)}
            <input
              data-field-id="${escapeHtml(field.id)}"
              type="${escapeHtml(field.type ?? "text")}"
              value="${escapeHtml(field.value ?? "")}"
              ${field.required ? "required" : ""}
            />
          </label>
        `,
      )
      .join("");

    elements.uxDialog.showModal();
    const firstInput = elements.uxFields.querySelector("input");
    firstInput?.focus();
  });
}

function openConfirmDialog({ title, message, submitLabel }) {
  return new Promise((resolve) => {
    state.uxResolver = resolve;
    state.uxMode = "confirm";
    elements.uxTitle.textContent = title;
    elements.uxMessage.hidden = false;
    elements.uxMessage.textContent = message;
    elements.uxSubmitButton.textContent = submitLabel;
    elements.uxError.hidden = true;
    elements.uxFields.innerHTML = "";
    elements.uxDialog.showModal();
  });
}

function showToast(message, kind = "info") {
  elements.toast.textContent = message;
  elements.toast.dataset.kind = kind;
  elements.toast.hidden = false;
  if (state.toastTimer) {
    clearTimeout(state.toastTimer);
  }
  state.toastTimer = window.setTimeout(() => {
    elements.toast.hidden = true;
  }, 2800);
}

function hydrateDialogTicket(ticket) {
  elements.ticketViewId.textContent = `#${ticket.id}`;
  elements.ticketViewTitle.textContent = ticket.title;
  elements.ticketViewMeta.innerHTML = renderTicketMeta(ticket);
  elements.ticketRelations.innerHTML = renderTicketRelations(ticket);
  elements.ticketViewBody.innerHTML = ticket.bodyHtml || '<p class="muted">No description</p>';
  elements.ticketComments.innerHTML = renderComments(ticket.comments ?? []);
  elements.ticketTitle.value = ticket.title;
  elements.ticketPriority.value = String(ticket.priority ?? 0);
  elements.ticketCompleted.checked = ticket.isCompleted;
  elements.ticketBody.value = ticket.bodyMarkdown;
  elements.ticketLane.value = String(ticket.laneId);
  elements.ticketParent.value = ticket.parentTicketId == null ? "" : String(ticket.parentTicketId);
  state.editorLabelIds = ticket.labels.map((label) => label.id);
  state.editorBlockerIds = [...ticket.blockerIds];
  state.editorChildIds = ticket.children.map((child) => child.id);
  state.editorOriginalChildIds = [...state.editorChildIds];
  state.labelQuery = "";
  state.blockerQuery = "";
  state.childQuery = "";
  elements.ticketLabelSearch.value = "";
  elements.ticketBlockerSearch.value = "";
  elements.ticketChildSearch.value = "";
  syncTicketLabelOptions();
  syncBlockerOptions();
  syncChildPickerAvailability();
  syncChildOptions();
}

function renderTicketMeta(ticket) {
  if (!ticket) {
    return "";
  }
  const priority = `<span class="status-pill">P${ticket.priority}</span>`;
  const labels = ticket.labels
    .map((label) => `<span class="label" style="background:${escapeHtml(label.color)}">${escapeHtml(label.name)}</span>`)
    .join("");
  const blockedBy = ticket.blockers.length
    ? ticket.blockers
        .map(
          (blocker) =>
            `<span class="status-pill">blocked by #${blocker.id}${blocker.priority ? ` P${blocker.priority}` : ""}</span>`,
        )
        .join("")
    : "";
  const blocking = getBoardTickets()
    .filter((candidate) => candidate.id !== ticket.id && candidate.blockerIds.includes(ticket.id))
    .map(
      (blockedTicket) =>
        `<span class="status-pill">blocks #${blockedTicket.id}${blockedTicket.priority ? ` P${blockedTicket.priority}` : ""}</span>`,
    )
    .join("");
  const completed = ticket.isCompleted ? '<span class="status-pill">Completed</span>' : '<span class="status-pill">Open</span>';
  return `${completed}${priority}${blockedBy}${blocking}${labels}`;
}

function renderTicketRelations(ticket) {
  if (!ticket) {
    return "";
  }
  const parts = [];
  if (ticket.parent) {
    parts.push(`<div><span class="muted">Parent</span> ${renderRelationLink(ticket.parent)}</div>`);
  }
  if (ticket.children.length) {
    parts.push(`<div><span class="muted">Children</span> ${ticket.children.map(renderRelationLink).join("")}</div>`);
  }
  return parts.join("");
}

function renderRelationLink(ticket) {
  return `<a class="ticket-inline-link" href="/tickets/${ticket.id}">#${ticket.id} P${ticket.priority} ${escapeHtml(ticket.title)}</a>`;
}

function renderComments(comments) {
  if (comments.length === 0) {
    return '<p class="muted">No comments yet.</p>';
  }
  return comments
    .map(
      (comment) => `
        <article class="comment-item">
          <div class="comment-meta muted">#${comment.id} ${new Date(comment.createdAt).toLocaleString()}</div>
          <div class="markdown">${comment.bodyHtml}</div>
        </article>
      `,
    )
    .join("");
}

function renderMarkdown(markdown) {
  const escaped = escapeHtml(markdown)
    .replace(/^### (.*)$/gm, "<h3>$1</h3>")
    .replace(/^## (.*)$/gm, "<h2>$1</h2>")
    .replace(/^# (.*)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\[(.+?)\]\((https?:\/\/[^\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/\n/g, "<br>");
  return escaped;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function api(url, init = {}) {
  const response = await fetch(url, {
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
    ...init,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(payload.error ?? response.statusText);
  }
  if (response.status === 204) {
    return null;
  }
  return response.json();
}

main().catch((error) => {
  console.error(error);
  showToast(error.message, "error");
});

function syncCompletedFilter(value = state.filters.completed) {
  state.filters.completed = value;
  elements.completedFilterButtons.forEach((button) => {
    button.classList.toggle("active", (button.dataset.value ?? "") === value);
  });
}
