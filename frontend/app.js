const form = document.getElementById("task-form");
const taskList = document.getElementById("task-list");
const errorMessage = document.getElementById("error-message");

function showError(msg) {
  errorMessage.textContent = msg;
  setTimeout(() => {
    errorMessage.textContent = "";
  }, 4000);
}

async function fetchTasks() {
  try {
    const res = await fetch(API_URL);

    if (!res.ok) {
      throw new Error("Failed to fetch tasks");
    }

    const data = await res.json();

    renderTasks(data.tasks || []);
    renderSummary(
      data.summary || {
        total: 0,
        done: 0,
        pending: 0,
      }
    );
  } catch (err) {
    console.error(err);
    showError("Could not load tasks.");
  }
}

function renderSummary(summary) {
  document.getElementById("total-count").textContent = summary.total ?? 0;
  document.getElementById("done-count").textContent = summary.done ?? 0;
  document.getElementById("pending-count").textContent = summary.pending ?? 0;
}

function renderTasks(tasks) {
  taskList.innerHTML = "";

  if (!tasks.length) {
    taskList.innerHTML = `
      <li style="text-align:center; color:#888;">
        No tasks yet. Add one above.
      </li>
    `;
    return;
  }

  for (const task of tasks) {
    const li = document.createElement("li");

    li.className = "task-item" + (task.done ? " done" : "");
    li.dataset.id = task.taskId;

    li.innerHTML = `
      <div class="task-main">
        <div class="task-display">

          <div class="task-title">
            ${escapeHtml(task.title)}
          </div>

          ${
            task.description
              ? `
                <div class="task-description">
                  ${escapeHtml(task.description)}
                </div>
              `
              : ""
          }

          <span class="priority-badge priority-${task.priority}">
            ${escapeHtml(task.priority)}
          </span>

        </div>

        <div class="task-edit-form" style="display:none;">

          <input
            type="text"
            class="edit-title"
            value="${escapeAttribute(task.title)}"
            placeholder="Task title"
          >

          <textarea
            class="edit-description"
            placeholder="Description"
          >${escapeHtml(task.description || "")}</textarea>

          <select class="edit-priority">
            <option value="low" ${
              task.priority === "low" ? "selected" : ""
            }>Low</option>

            <option value="medium" ${
              task.priority === "medium" ? "selected" : ""
            }>Medium</option>

            <option value="high" ${
              task.priority === "high" ? "selected" : ""
            }>High</option>
          </select>

        </div>
      </div>

      <div class="task-actions">

        <button
          class="btn-done"
          data-action="toggle"
          data-id="${task.taskId}"
          data-done="${task.done}">
          ${task.done ? "Undo" : "Done"}
        </button>

        <button
          class="btn-edit"
          data-action="edit"
          data-id="${task.taskId}">
          Edit
        </button>

        <button
          class="btn-save"
          data-action="save"
          data-id="${task.taskId}"
          style="display:none;">
          Save
        </button>

        <button
          class="btn-cancel"
          data-action="cancel"
          data-id="${task.taskId}"
          style="display:none;">
          Cancel
        </button>

        <button
          class="btn-delete"
          data-action="delete"
          data-id="${task.taskId}">
          Delete
        </button>

      </div>
    `;

    taskList.appendChild(li);
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

function escapeAttribute(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* ADD TASK */

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = document.getElementById("title").value.trim();
  const description = document
    .getElementById("description")
    .value.trim();

  const priority = document.getElementById("priority").value;

  if (!title) {
    showError("Please enter a task title.");
    return;
  }

  try {
    const res = await fetch(API_URL, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        title,
        description,
        priority,
      }),
    });

    if (!res.ok) {
      throw new Error("Failed to create task");
    }

    form.reset();
    document.getElementById("priority").value = "medium";

    await fetchTasks();
  } catch (err) {
    console.error(err);
    showError("Could not add task.");
  }
});

/* TASK ACTIONS */

taskList.addEventListener("click", async (e) => {
  const btn = e.target.closest("button");

  if (!btn) return;

  const { action, id } = btn.dataset;

  const taskItem = btn.closest(".task-item");

  if (!taskItem) return;

  const displaySection =
    taskItem.querySelector(".task-display");

  const editForm =
    taskItem.querySelector(".task-edit-form");

  const editButton =
    taskItem.querySelector(".btn-edit");

  const saveButton =
    taskItem.querySelector(".btn-save");

  const cancelButton =
    taskItem.querySelector(".btn-cancel");

  try {

    /* DONE / UNDO */

    if (action === "toggle") {
      const currentlyDone =
        btn.dataset.done === "true";

      const res = await fetch(`${API_URL}/${id}`, {
        method: "PUT",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          done: !currentlyDone,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to update task");
      }

      await fetchTasks();
    }

    /* ENTER EDIT MODE */

    else if (action === "edit") {
      displaySection.style.display = "none";
      editForm.style.display = "flex";

      editButton.style.display = "none";
      saveButton.style.display = "inline-block";
      cancelButton.style.display = "inline-block";
    }

    /* CANCEL EDIT */

    else if (action === "cancel") {
      displaySection.style.display = "";
      editForm.style.display = "none";

      editButton.style.display = "inline-block";
      saveButton.style.display = "none";
      cancelButton.style.display = "none";
    }

    /* SAVE EDIT */

    else if (action === "save") {
      const newTitle =
        taskItem.querySelector(".edit-title").value.trim();

      const newDescription =
        taskItem
          .querySelector(".edit-description")
          .value.trim();

      const newPriority =
        taskItem.querySelector(".edit-priority").value;

      if (!newTitle) {
        showError("Task title cannot be empty.");
        return;
      }

      const res = await fetch(`${API_URL}/${id}`, {
        method: "PUT",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          title: newTitle,
          description: newDescription,
          priority: newPriority,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to edit task");
      }

      await fetchTasks();
    }

    /* DELETE */

    else if (action === "delete") {
      const confirmed =
        confirm("Are you sure you want to delete this task?");

      if (!confirmed) return;

      const res = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete task");
      }

      await fetchTasks();
    }

  } catch (err) {
    console.error(err);
    showError("Action failed. Please try again.");
  }
});

/* INITIAL LOAD */

fetchTasks();
