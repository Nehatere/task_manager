const form = document.getElementById("task-form");
const taskList = document.getElementById("task-list");
const errorMessage = document.getElementById("error-message");
const assignedToSelect = document.getElementById("assignedTo");

const token = sessionStorage.getItem("taskManagerToken");

let currentUser = null;
let employees = [];

try {
  currentUser = JSON.parse(
    sessionStorage.getItem("taskManagerUser") || "null"
  );
} catch {
  currentUser = null;
}

/* ---------- Protect Admin Page ---------- */

if (!token || !currentUser || currentUser.role !== "admin") {
  window.location.replace("/login/");
}

/* ---------- Helpers ---------- */

function showError(msg) {
  errorMessage.textContent = msg;

  setTimeout(() => {
    errorMessage.textContent = "";
  }, 4000);
}

function logoutAndRedirect() {
  sessionStorage.removeItem("taskManagerToken");
  sessionStorage.removeItem("taskManagerUser");
  window.location.replace("/login/");
}

async function adminFetch(url, options = {}) {
  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`
  };

  const res = await fetch(url, {
    ...options,
    headers
  });

  if (res.status === 401 || res.status === 403) {
    logoutAndRedirect();
    throw new Error("Session expired");
  }

  return res;
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

function formatStatus(status) {
  if (status === "in-progress") return "In Progress";
  if (status === "completed") return "Completed";
  return "To Do";
}

function getEmployeeName(username) {
  const employee = employees.find(
    member =>
      member.username.toLowerCase() ===
      String(username || "").toLowerCase()
  );

  if (!employee) {
    return username || "Unassigned";
  }

  return `${employee.name} (@${employee.username})`;
}

/* ---------- Load Employees ---------- */

async function loadEmployees() {
  try {
    assignedToSelect.innerHTML = `
      <option value="">Loading employees...</option>
    `;

    assignedToSelect.disabled = true;

    const res = await adminFetch(
      `${API_BASE_URL}/team-members`
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(
        data.error || "Could not load employees"
      );
    }

    employees = data.members || [];

    assignedToSelect.innerHTML = `
      <option value="">Select employee</option>
    `;

    employees.forEach(employee => {
      const option = document.createElement("option");

      option.value = employee.username;
      option.textContent =
        `${employee.name} (@${employee.username})`;

      assignedToSelect.appendChild(option);
    });

    assignedToSelect.disabled = false;

    if (employees.length === 0) {
      assignedToSelect.innerHTML = `
        <option value="">No employees available</option>
      `;
    }

  } catch (err) {
    console.error(err);

    if (err.message !== "Session expired") {
      assignedToSelect.innerHTML = `
        <option value="">Could not load employees</option>
      `;

      showError("Could not load employees.");
    }
  }
}

/* ---------- Fetch Tasks ---------- */

async function fetchTasks() {
  try {
    const res = await fetch(API_URL);

    if (!res.ok) {
      throw new Error("Failed to fetch tasks");
    }

    const data = await res.json();
    const tasks = data.tasks || [];

    renderTasks(tasks);
    renderSummary(tasks);

  } catch (err) {
    console.error(err);
    showError("Could not load tasks.");
  }
}

/* ---------- Summary ---------- */

function renderSummary(tasks) {
  const total = tasks.length;

  const todo = tasks.filter(
    task => (task.status || "todo") === "todo"
  ).length;

  const progress = tasks.filter(
    task => task.status === "in-progress"
  ).length;

  const completed = tasks.filter(
    task => task.status === "completed"
  ).length;

  document.getElementById("total-count").textContent = total;
  document.getElementById("todo-count").textContent = todo;
  document.getElementById("progress-count").textContent = progress;
  document.getElementById("completed-count").textContent = completed;
}

/* ---------- Employee Edit Dropdown ---------- */

function buildEmployeeOptions(selectedUsername) {
  let options = "";

  const selectedExists = employees.some(
    employee =>
      employee.username.toLowerCase() ===
      String(selectedUsername || "").toLowerCase()
  );

  if (selectedUsername && !selectedExists) {
    options += `
      <option
        value="${escapeAttribute(selectedUsername)}"
        selected>
        ${escapeHtml(selectedUsername)} (existing)
      </option>
    `;
  }

  employees.forEach(employee => {
    const selected =
      employee.username.toLowerCase() ===
      String(selectedUsername || "").toLowerCase()
        ? "selected"
        : "";

    options += `
      <option
        value="${escapeAttribute(employee.username)}"
        ${selected}>
        ${escapeHtml(employee.name)} (@${escapeHtml(employee.username)})
      </option>
    `;
  });

  return options;
}

/* ---------- Render Tasks ---------- */

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
    const status =
      task.status ||
      (task.done ? "completed" : "todo");

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
              ? `
                <div class="task-description">
                  ${escapeHtml(task.description)}
                </div>
              `
              : ""
          }

          <div class="task-assigned">
            <strong>Assigned to:</strong>
            ${escapeHtml(getEmployeeName(task.assignedTo))}
          </div>

          <div class="task-meta">

            <span class="priority-badge priority-${task.priority}">
              ${escapeHtml(task.priority)}
            </span>

            <span class="status-badge status-badge-${status}">
              ${formatStatus(status)}
            </span>

          </div>

        </div>

        <div
          class="task-edit-form"
          style="display:none;"
        >

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

          <select class="edit-assigned">
            ${buildEmployeeOptions(task.assignedTo)}
          </select>

          <select class="edit-priority">

            <option
              value="low"
              ${task.priority === "low" ? "selected" : ""}>
              Low
            </option>

            <option
              value="medium"
              ${task.priority === "medium" ? "selected" : ""}>
              Medium
            </option>

            <option
              value="high"
              ${task.priority === "high" ? "selected" : ""}>
              High
            </option>

          </select>

          <select class="edit-status">

            <option
              value="todo"
              ${status === "todo" ? "selected" : ""}>
              To Do
            </option>

            <option
              value="in-progress"
              ${status === "in-progress" ? "selected" : ""}>
              In Progress
            </option>

            <option
              value="completed"
              ${status === "completed" ? "selected" : ""}>
              Completed
            </option>

          </select>

        </div>

      </div>

      <div class="task-actions">

        <select
          class="status-select"
          data-action="status"
          data-id="${task.taskId}">

          <option
            value="todo"
            ${status === "todo" ? "selected" : ""}>
            To Do
          </option>

          <option
            value="in-progress"
            ${status === "in-progress" ? "selected" : ""}>
            In Progress
          </option>

          <option
            value="completed"
            ${status === "completed" ? "selected" : ""}>
            Completed
          </option>

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

/* ---------- Create Task ---------- */

form.addEventListener("submit", async event => {
  event.preventDefault();

  const title =
    document.getElementById("title").value.trim();

  const description =
    document.getElementById("description").value.trim();

  const priority =
    document.getElementById("priority").value;

  const assignedTo =
    document.getElementById("assignedTo").value;

  if (!title) {
    showError("Please enter a task title.");
    return;
  }

  if (!assignedTo) {
    showError("Please select an employee.");
    return;
  }

  try {
    const res = await fetch(API_URL, {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        title,
        description,
        priority,
        assignedTo
      })
    });

    if (!res.ok) {
      throw new Error("Failed to create task");
    }

    form.reset();

    document.getElementById("priority").value = "medium";
    document.getElementById("assignedTo").value = "";

    await fetchTasks();

  } catch (err) {
    console.error(err);
    showError("Could not add task.");
  }
});

/* ---------- Task Status Change ---------- */

taskList.addEventListener("change", async event => {
  const select =
    event.target.closest(".status-select");

  if (!select) {
    return;
  }

  const id = select.dataset.id;
  const status = select.value;

  try {
    const res = await fetch(
      `${API_URL}/${id}`,
      {
        method: "PUT",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          status
        })
      }
    );

    if (!res.ok) {
      throw new Error("Failed to update status");
    }

    await fetchTasks();

  } catch (err) {
    console.error(err);

    showError("Could not update task status.");

    await fetchTasks();
  }
});

/* ---------- Task Actions ---------- */

taskList.addEventListener("click", async event => {
  const btn = event.target.closest("button");

  if (!btn) {
    return;
  }

  const { action, id } = btn.dataset;

  const taskItem =
    btn.closest(".task-item");

  if (!taskItem) {
    return;
  }

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

  const statusSelect =
    taskItem.querySelector(".status-select");

  try {

    /* ---------- Edit ---------- */

    if (action === "edit") {
      displaySection.style.display = "none";
      editForm.style.display = "flex";
      editButton.style.display = "none";
      saveButton.style.display = "inline-block";
      cancelButton.style.display = "inline-block";
      statusSelect.style.display = "none";
    }

    /* ---------- Cancel ---------- */

    else if (action === "cancel") {
      displaySection.style.display = "";
      editForm.style.display = "none";
      editButton.style.display = "inline-block";
      saveButton.style.display = "none";
      cancelButton.style.display = "none";
      statusSelect.style.display = "inline-block";
    }

    /* ---------- Save ---------- */

    else if (action === "save") {
      const newTitle =
        taskItem.querySelector(".edit-title").value.trim();

      const newDescription =
        taskItem.querySelector(".edit-description").value.trim();

      const newAssignedTo =
        taskItem.querySelector(".edit-assigned").value;

      const newPriority =
        taskItem.querySelector(".edit-priority").value;

      const newStatus =
        taskItem.querySelector(".edit-status").value;

      if (!newTitle) {
        showError("Task title cannot be empty.");
        return;
      }

      if (!newAssignedTo) {
        showError("Please select an employee.");
        return;
      }

      const res = await fetch(
        `${API_URL}/${id}`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            title: newTitle,
            description: newDescription,
            priority: newPriority,
            assignedTo: newAssignedTo,
            status: newStatus
          })
        }
      );

      if (!res.ok) {
        throw new Error("Failed to edit task");
      }

      await fetchTasks();
    }

    /* ---------- Delete ---------- */

    else if (action === "delete") {
      const confirmed = confirm(
        "Are you sure you want to delete this task?"
      );

      if (!confirmed) {
        return;
      }

      const res = await fetch(
        `${API_URL}/${id}`,
        {
          method: "DELETE"
        }
      );

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

/* ---------- Start Application ---------- */

async function startApp() {
  await loadEmployees();
  await fetchTasks();
}

startApp();
