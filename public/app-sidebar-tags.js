import { tagBackgroundStyle, tagToneClass } from "./app-tags.js";
import { icon } from "./icons.js";

export function createSidebarTagsModule(ctx) {
  const { state, elements } = ctx;

  async function createTag() {
    if (!state.activeBoardId) {
      return;
    }
    const values = await ctx.requestFields({
      title: "New Tag",
      submitLabel: "Create",
      fields: [
        { id: "name", label: "Tag name", value: "", required: true },
        { id: "color", label: "Color", value: "#1f6f5f", required: true, type: "color", allowNone: true, enabled: false },
      ],
    });
    if (!values) {
      return;
    }
    const created = await ctx.sendJson(`/api/boards/${state.activeBoardId}/tags`, {
      method: "POST",
      body: { name: values.name, color: values.color },
    });
    await ctx.refreshBoardDetail();
    state.editorTagIds = [...new Set([...state.editorTagIds, created.id])];
    ctx.syncTicketTagOptions();
  }

  function renderSidebarTags() {
    const tags = state.boardDetail?.tags ?? [];
    if (tags.length === 0) {
      elements.sidebarTagList.innerHTML = '<p class="tag-manager-empty muted">No tags yet.</p>';
      return;
    }

    elements.sidebarTagList.innerHTML = "";
    for (const tag of tags) {
      const row = document.createElement("div");
      row.className = "sidebar-tag-row";
      row.innerHTML = `
        <button type="button" class="sidebar-tag-badge${tagToneClass(tag)}"${tagBackgroundStyle(tag, ctx.escapeHtml)} title="Edit tag: ${ctx.escapeHtml(tag.name)}" aria-label="Edit tag: ${ctx.escapeHtml(tag.name)}">
          <span>${ctx.escapeHtml(tag.name)}</span>
          ${icon("pencil")}
        </button>
      `;
      row.querySelector(".sidebar-tag-badge").addEventListener("click", () => editSidebarTag(tag));

      elements.sidebarTagList.append(row);
    }
  }

  async function editSidebarTag(tag) {
    const result = await ctx.requestFieldsAction({
      title: "Edit Tag",
      submitLabel: "Save",
      dangerLabel: "Delete",
      fields: [
        { id: "name", label: "Tag name", value: tag.name, required: true },
        { id: "color", label: "Color", value: tag.color, required: true, type: "color", allowNone: true },
      ],
    });
    if (!result) {
      return;
    }
    try {
      if (result.action === "danger") {
        await ctx.api(`/api/tags/${tag.id}`, { method: "DELETE" });
        ctx.showToast("Tag deleted");
      } else if (result.action === "submit") {
        await ctx.sendJson(`/api/tags/${tag.id}`, {
          method: "PATCH",
          body: { name: result.values.name, color: result.values.color },
        });
        ctx.showToast("Tag updated");
      }
      await ctx.refreshBoardDetail();
      ctx.syncTicketTagOptions();
      renderSidebarTags();
    } catch (error) {
      ctx.showToast(error.message, "error");
    }
  }

  return {
    createTag,
    renderSidebarTags,
  };
}
