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
          <article class="comment-item">
            <div class="comment-meta muted">
              <span>#${comment.id} ${new Date(comment.createdAt).toLocaleString()}</span>
              <span class="comment-actions">
                <button type="button" class="ghost icon-button" data-edit-comment-id="${comment.id}" title="Edit comment" aria-label="Edit comment">${icon("pencil")}</button>
                <button type="button" class="ghost icon-button danger" data-delete-comment-id="${comment.id}" title="Delete comment" aria-label="Delete comment">${icon("trash-2")}</button>
              </span>
            </div>
            <div class="markdown">${comment.bodyHtml}</div>
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
    const editButton = event.target.closest("[data-edit-comment-id]");
    if (editButton) {
      await editComment(Number(editButton.dataset.editCommentId));
      return;
    }

    const deleteButton = event.target.closest("[data-delete-comment-id]");
    if (deleteButton) {
      await deleteComment(Number(deleteButton.dataset.deleteCommentId));
    }
  }

  async function editComment(commentId) {
    try {
      const ticket = await ctx.api(`/api/tickets/${state.editingTicketId}`);
      const current = (ticket.comments ?? []).find((comment) => comment.id === commentId);
      if (!current) {
        throw new Error("Comment not found");
      }
      const values = await ctx.requestFields({
        title: "Edit Comment",
        submitLabel: "Save",
        fields: [{ id: "bodyMarkdown", label: "Comment", type: "textarea", rows: 8, value: current.bodyMarkdown, required: true }],
      });
      if (!values) {
        return;
      }
      ctx.setSaveState("saving", "Saving...");
      await ctx.sendJson(`/api/comments/${commentId}`, {
        method: "PATCH",
        body: { bodyMarkdown: values.bodyMarkdown },
      });
      await ctx.refreshDialogTicket();
      await ctx.refreshBoardDetail();
      ctx.setSaveState("saved", "Saved");
    } catch (error) {
      ctx.setSaveState("error", "Save failed");
      ctx.showToast(error.message, "error");
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
