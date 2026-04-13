import { icon } from "./icons.js";

export function createBoardSettingsModule(ctx) {
  const { state, elements } = ctx;

  async function renameBoard() {
    if (!state.boardDetail) {
      return;
    }
    const values = await ctx.requestFields({
      title: "Rename Board",
      submitLabel: "Save",
      fields: [{ id: "name", label: "Board name", value: state.boardDetail.board.name, required: true }],
    });
    if (!values) {
      return;
    }
    await ctx.sendJson(`/api/boards/${state.activeBoardId}`, {
      method: "PATCH",
      body: { name: values.name },
    });
    await ctx.refreshBoards();
  }

  async function deleteBoard() {
    if (!state.boardDetail) {
      return;
    }
    const board = state.boardDetail.board;
    const nextBoard = state.boards.find((entry) => entry.id !== board.id) ?? null;
    await ctx.confirmAndRun({
      title: "Delete Board",
      message: `Delete board "${board.name}" and all of its tickets?`,
      submitLabel: "Delete",
      run: async () => {
        await ctx.api(`/api/boards/${board.id}`, { method: "DELETE" });
        state.activeBoardId = nextBoard?.id ?? null;
        await ctx.refreshBoards();
        ctx.syncBoardUrl();
      },
    });
  }

  async function exportBoard() {
    if (!state.activeBoardId) {
      return;
    }
    const payload = await ctx.api(`/api/boards/${state.activeBoardId}/export`);
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
    const imported = await ctx.api("/api/boards/import", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    state.activeBoardId = imported.board.id;
    event.target.value = "";
    await ctx.refreshBoards();
    ctx.syncBoardUrl();
  }

  function toggleSidebar() {
    state.sidebarCollapsed = !state.sidebarCollapsed;
    localStorage.setItem("soloboard:sidebar-collapsed", String(state.sidebarCollapsed));
    syncSidebar();
  }

  function syncSidebar() {
    elements.shell.classList.toggle("sidebar-collapsed", state.sidebarCollapsed);
    elements.sidebarReopenButton.hidden = !state.sidebarCollapsed;
    elements.sidebarToggleButton.innerHTML = icon(state.sidebarCollapsed ? "menu" : "chevron-left");
  }

  function toggleBoardSettings() {
    state.boardSettingsExpanded = !state.boardSettingsExpanded;
    syncBoardSettingsPanel();
  }

  function syncBoardSettingsPanel() {
    elements.sidebarBoardSection.classList.toggle("expanded", state.boardSettingsExpanded);
    elements.boardSettingsToggleButton.setAttribute("aria-expanded", String(state.boardSettingsExpanded));
    elements.sidebarBoardActionsPanel.toggleAttribute("inert", !state.boardSettingsExpanded);
    elements.sidebarBoardActionsPanel.setAttribute("aria-hidden", String(!state.boardSettingsExpanded));
  }

  return {
    renameBoard,
    deleteBoard,
    exportBoard,
    importBoard,
    toggleSidebar,
    syncSidebar,
    toggleBoardSettings,
    syncBoardSettingsPanel,
  };
}
