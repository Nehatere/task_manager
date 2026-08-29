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
    if (!res.ok) throw new Error("Failed to fetch tasks");

    const data = await res.json();
    const tasks = data.tasks || [];

    renderTasks(tasks);
    renderSummary(tasks);
  } catch (err) {
    console.error(err);
    showError("Could not load tasks.");
  }
}

function renderSummary(tasks) {
  const total = tasks.length;
  const todo = tasks.filter(task => (task.status || "todo") === "todo").length;
  const progress = tasks.filter(task => task.status === "in-progress").length;
  const completed = tasks.filter(task => task.status === "completed").length;

  document.getElementById("total-count").textContent = total;
  document.getElementById("todo-count").textContent = todo;
  document.getElementById("progress-count").textContent = progress;
  document.getElementById("completed-count").textContent = completed;
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
    const status = task.status || "todo";
    const li = document.createElement("li");

    li.className = `task-item status-${status}`;
    li.dataset.id = task.taskId;

    li.innerHTML = `
      <div class="task-main">
        <div class="task-display">

          <div class="task-title">
            ${escapeHtml(task.title)}
          </div>

          ${
            task.description
              ? `<div class="task-description">${escapeHtml(task.description)}</div>`
              : ""
          }

          ${
            task.assignedTo
              ? `<div class="task-assigned"><strong>Assigned to:</strong> ${escapeHtml(task.assignedTo)}</div>`
              : ""
          }

          <div class="task-meta">
            <span class="priority-badge priority-${task.priority}">
              ${escapeHtml(task.priority)}
            </span>

            <span class="status-badge status-badge-${status}">
              ${formatStatus(status)}
            </span>
          </div>
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

          <input
            type="text"
            class="edit-assigned"
            value="${escapeAttribute(task.assignedTo || "")}"
            placeholder="Assigned to"
          >

          <select class="edit-priority">
            <option value="low" ${task.priority === "low" ? "selected" : ""}>Low</option>
            <option value="medium" ${task.priority === "medium" ? "selected" : ""}>Medium</option>
            <option value="high" ${task.priority === "high" ? "selected" : ""}>High</option>
          </select>

          <select class="edit-status">
            <option value="todo" ${status === "todo" ? "selected" : ""}>To Do</option>
            <option value="in-progress" ${status === "in-progress" ? "selected" : ""}>In Progress</option>
            <option value="completed" ${status === "completed" ? "selected" : ""}>Completed</option>
          </select>

        </div>
      </div>

      <div class="task-actions">

        <select
          class="status-select"
          data-action="status"
          data-id="${task.taskId}">
          <option value="todo" ${status === "todo" ? "selected" : ""}>To Do</option>
          <option value="in-progress" ${status === "in-progress" ? "selected" : ""}>In Progress</option>
          <option value="completed" ${status === "completed" ? "selected" : ""}>Completed</option>
        </select>

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

function formatStatus(status) {
  if (status === "in-progress") return "In Progress";
  if (status === "completed") return "Completed";
  return "To Do";
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

/* add a task function */

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = document.getElementById("title").value.trim();
  const description = document.getElementById("description").value.trim();
  const priority = document.getElementById("priority").value;
  const assignedTo = document.getElementById("assignedTo").value.trim();

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
        assignedTo,
      }),
    });

    if (!res.ok) throw new Error("Failed to create task");

    form.reset();
    document.getElementById("priority").value = "medium";

    await fetchTasks();
  } catch (err) {
    console.error(err);
    showError("Could not add task.");
  }
});

/* task status change */

taskList.addEventListener("change", async (e) => {
  const select = e.target.closest(".status-select");
  if (!select) return;

  const id = select.dataset.id;
  const status = select.value;

  try {
    const res = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status,
      }),
    });

    if (!res.ok) throw new Error("Failed to update status");

    await fetchTasks();
  } catch (err) {
    console.error(err);
    showError("Could not update task status.");
    await fetchTasks();
  }
});

/* task actions */

taskList.addEventListener("click", async (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const { action, id } = btn.dataset;
  const taskItem = btn.closest(".task-item");
  if (!taskItem) return;

  const displaySection = taskItem.querySelector(".task-display");
  const editForm = taskItem.querySelector(".task-edit-form");
  const editButton = taskItem.querySelector(".btn-edit");
  const saveButton = taskItem.querySelector(".btn-save");
  const cancelButton = taskItem.querySelector(".btn-cancel");
  const statusSelect = taskItem.querySelector(".status-select");

  try {
    /* edit function */

    if (action === "edit") {
      displaySection.style.display = "none";
      editForm.style.display = "flex";
      editButton.style.display = "none";
      saveButton.style.display = "inline-block";
      cancelButton.style.display = "inline-block";
      statusSelect.style.display = "none";
    }

    /* cancel section */

    else if (action === "cancel") {
      displaySection.style.display = "";
      editForm.style.display = "none";
      editButton.style.display = "inline-block";
      saveButton.style.display = "none";
      cancelButton.style.display = "none";
      statusSelect.style.display = "inline-block";
    }

    /* save section */

    else if (action === "save") {
      const newTitle = taskItem.querySelector(".edit-title").value.trim();
      const newDescription = taskItem.querySelector(".edit-description").value.trim();
      const newAssignedTo = taskItem.querySelector(".edit-assigned").value.trim();
      const newPriority = taskItem.querySelector(".edit-priority").value;
      const newStatus = taskItem.querySelector(".edit-status").value;

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
          assignedTo: newAssignedTo,
          status: newStatus,
        }),
      });

      if (!res.ok) throw new Error("Failed to edit task");

      await fetchTasks();
    }

    /* delete section */

    else if (action === "delete") {
      const confirmed = confirm("Are you sure you want to delete this task?");
      if (!confirmed) return;

      const res = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete task");

      await fetchTasks();
    }
  } catch (err) {
    console.error(err);
    showError("Action failed. Please try again.");
  }
});

fetchTasks();
