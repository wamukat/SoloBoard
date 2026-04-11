import { icon } from "./icons.js";

export function createTicketCommentsModule(ctx) {
  const { state, elements } = ctx;

  function renderComments(comments) {
    if (comments.length === 0) {
      return '<p class="muted">No comments yet.</p>';
    }
    return comments
      .map(
        (comment) => `
          <article class="comment-item" data-comment-id="${comment.id}">
            <div class="comment-meta muted">
              <span>#${comment.id} ${new Date(comment.createdAt).toLocaleString()}</span>
              <span class="comment-actions">
                <button type="button" class="ghost icon-button action-menu-toggle" data-toggle-comment-actions title="Comment actions" aria-label="Comment actions" aria-expanded="false">${icon("ellipsis")}</button>
                <span class="inline-action-menu" hidden>
                  <button type="button" class="ghost icon-button" data-edit-comment-id="${comment.id}" title="Edit comment" aria-label="Edit comment">${icon("pencil")}</button>
                  <button type="button" class="ghost icon-button danger" data-delete-comment-id="${comment.id}" title="Delete comment" aria-label="Delete comment">${icon("trash-2")}</button>
                </span>
              </span>
            </div>
            <div class="markdown comment-display">${comment.bodyHtml}</div>
            <form class="comment-edit-form" data-comment-edit-form hidden>
              <textarea data-comment-edit-body rows="5" aria-label="Comment">${ctx.escapeHtml(comment.bodyMarkdown)}</textarea>
              <div class="comment-edit-actions">
                <button type="button" class="ghost" data-cancel-comment-edit>Cancel</button>
                <button type="button" class="primary-action" data-save-comment-id="${comment.id}">Save</button>
              </div>
            </form>
          </article>
        `,
      )
      .join("");
  }

  async function addComment(event) {
    event?.preventDefault?.();
    if (!state.editingTicketId) {
      return;
    }
    const bodyMarkdown = elements.commentBody.value.trim();
    if (!bodyMarkdown) {
      ctx.showToast("Comment is required", "error");
      return;
    }
    try {
      elements.saveCommentButton.disabled = true;
      await ctx.sendJson(`/api/tickets/${state.editingTicketId}/comments`, {
        method: "POST",
        body: { bodyMarkdown },
      });
      const ticket = await ctx.api(`/api/tickets/${state.editingTicketId}`);
      await ctx.refreshDialogTicket(ticket.id);
      elements.commentBody.value = "";
      await ctx.refreshBoardDetail();
      ctx.setSaveState("saved", "Comment saved");
    } catch (error) {
      ctx.setSaveState("error", "Save failed");
      ctx.showToast(error.message, "error");
    } finally {
      elements.saveCommentButton.disabled = false;
    }
  }

  async function handleCommentAction(event) {
    const toggleButton = event.target.closest("[data-toggle-comment-actions]");
    if (toggleButton) {
      toggleCommentActions(toggleButton);
      return;
    }

    const editButton = event.target.closest("[data-edit-comment-id]");
    if (editButton) {
      editCommentInline(editButton);
      return;
    }

    const cancelButton = event.target.closest("[data-cancel-comment-edit]");
    if (cancelButton) {
      cancelCommentInlineEdit(cancelButton);
      return;
    }

    const saveButton = event.target.closest("[data-save-comment-id]");
    if (saveButton) {
      await saveCommentInline(saveButton);
      return;
    }

    const deleteButton = event.target.closest("[data-delete-comment-id]");
    if (deleteButton) {
      await deleteComment(Number(deleteButton.dataset.deleteCommentId));
    }
  }

  function toggleCommentActions(toggleButton) {
    const menu = toggleButton.parentElement?.querySelector(".inline-action-menu");
    if (!menu) {
      return;
    }
    const isExpanded = toggleButton.getAttribute("aria-expanded") === "true";
    toggleButton.setAttribute("aria-expanded", String(!isExpanded));
    menu.hidden = false;
    menu.classList.toggle("expanded", !isExpanded);
    menu.toggleAttribute("inert", isExpanded);
    if (isExpanded) {
      window.setTimeout(() => {
        if (!menu.classList.contains("expanded")) {
          menu.hidden = true;
        }
      }, 180);
    }
  }

  function editCommentInline(editButton) {
    const item = editButton.closest(".comment-item");
    if (!item) {
      return;
    }
    const toggleButton = item.querySelector("[data-toggle-comment-actions]");
    const menu = item.querySelector(".inline-action-menu");
    toggleButton?.setAttribute("aria-expanded", "false");
    menu?.classList.remove("expanded");
    menu?.toggleAttribute("inert", true);
    if (menu) {
      menu.hidden = true;
    }
    item.querySelector(".comment-display").hidden = true;
    const form = item.querySelector("[data-comment-edit-form]");
    form.hidden = false;
    form.querySelector("[data-comment-edit-body]")?.focus();
  }

  function cancelCommentInlineEdit(cancelButton) {
    const item = cancelButton.closest(".comment-item");
    if (!item) {
      return;
    }
    const form = item.querySelector("[data-comment-edit-form]");
    const textarea = item.querySelector("[data-comment-edit-body]");
    if (textarea) {
      textarea.value = textarea.defaultValue;
    }
    form.hidden = true;
    item.querySelector(".comment-display").hidden = false;
  }

  async function saveCommentInline(saveButton) {
    const item = saveButton.closest(".comment-item");
    const textarea = item?.querySelector("[data-comment-edit-body]");
    const bodyMarkdown = textarea?.value.trim() ?? "";
    if (!bodyMarkdown) {
      ctx.showToast("Comment is required", "error");
      return;
    }
    try {
      saveButton.disabled = true;
      ctx.setSaveState("saving", "Saving...");
      await ctx.sendJson(`/api/comments/${saveButton.dataset.saveCommentId}`, {
        method: "PATCH",
        body: { bodyMarkdown },
      });
      await ctx.refreshDialogTicket();
      await ctx.refreshBoardDetail();
      ctx.setSaveState("saved", "Saved");
    } catch (error) {
      ctx.setSaveState("error", "Save failed");
      ctx.showToast(error.message, "error");
    } finally {
      saveButton.disabled = false;
    }
  }

  async function deleteComment(commentId) {
    await ctx.confirmAndRun({
      title: "Delete Comment",
      message: "Delete this comment?",
      submitLabel: "Delete",
      run: async () => {
        try {
          ctx.setSaveState("saving", "Deleting...");
          await ctx.api(`/api/comments/${commentId}`, { method: "DELETE" });
          await ctx.refreshDialogTicket();
          await ctx.refreshBoardDetail();
          ctx.setSaveState("saved", "Deleted");
        } catch (error) {
          ctx.setSaveState("error", "Delete failed");
          throw error;
        }
      },
    });
  }

  return {
    addComment,
    handleCommentAction,
    renderComments,
  };
}
