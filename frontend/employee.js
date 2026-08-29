const taskList = document.getElementById("employee-task-list");
const messageElement = document.getElementById("employee-message");
const employeeName = document.getElementById("employee-name");
const employeeUsername = document.getElementById("employee-username");
const logoutButton = document.getElementById("logout-button");

const token = sessionStorage.getItem("taskManagerToken");

let currentUser = null;

try {
  currentUser = JSON.parse(
    sessionStorage.getItem("taskManagerUser") || "null"
  );
} catch {
  currentUser = null;
}

/* ---------- Protect Employee Page ---------- */

if (!token || !currentUser || currentUser.role !== "employee") {
  window.location.replace("/login/");
}

/* ---------- Display Employee ---------- */

if (currentUser) {
  employeeName.textContent =
    currentUser.name || currentUser.username;

  employeeUsername.textContent =
    `@${currentUser.username}`;
}

/* ---------- Helpers ---------- */

function showMessage(message, type = "error") {
  messageElement.textContent = message;

  messageElement.style.color =
    type === "success" ? "#2e7d32" : "#c62828";

  if (message) {
    setTimeout(() => {
      messageElement.textContent = "";
    }, 4000);
  }
}

function clearSession() {
  sessionStorage.removeItem("taskManagerToken");
  sessionStorage.removeItem("taskManagerUser");
}

function redirectToLogin() {
  clearSession();
  window.location.replace("/login/");
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value || "";
  return div.innerHTML;
}

function formatStatus(status) {
  if (status === "in-progress") {
    return "In Progress";
  }

  if (status === "completed") {
    return "Completed";
  }

  return "To Do";
}

async function employeeFetch(url, options = {}) {
  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`
  };

  const res = await fetch(url, {
    ...options,
    headers
  });

  if (res.status === 401 || res.status === 403) {
    redirectToLogin();
    throw new Error("Session expired");
  }

  return res;
}

/* ---------- Load Employee Tasks ---------- */

async function loadTasks() {
  try {
    taskList.innerHTML = `
      <div class="empty-state">
        Loading your tasks...
      </div>
    `;

    const res = await employeeFetch(
      `${API_BASE_URL}/employee/tasks`
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(
        data.error || "Could not load tasks"
      );
    }

    const tasks = data.tasks || [];

    renderSummary(tasks);
    renderTasks(tasks);

  } catch (err) {
    console.error(err);

    if (err.message !== "Session expired") {
      taskList.innerHTML = `
        <div class="empty-state">
          Could not load your tasks.
        </div>
      `;

      showMessage("Could not load your tasks.");
    }
  }
}

/* ---------- Summary ---------- */

function renderSummary(tasks) {
  const total = tasks.length;

  const todo = tasks.filter(task => {
    const status =
      task.status ||
      (task.done ? "completed" : "todo");

    return status === "todo";
  }).length;

  const progress = tasks.filter(task => {
    const status =
      task.status ||
      (task.done ? "completed" : "todo");

    return status === "in-progress";
  }).length;

  const completed = tasks.filter(task => {
    const status =
      task.status ||
      (task.done ? "completed" : "todo");

    return status === "completed";
  }).length;

  document.getElementById("total-count").textContent =
    total;

  document.getElementById("todo-count").textContent =
    todo;

  document.getElementById("progress-count").textContent =
    progress;

  document.getElementById("completed-count").textContent =
    completed;
}

/* ---------- Render Tasks ---------- */

function renderTasks(tasks) {
  taskList.innerHTML = "";

  if (tasks.length === 0) {
    taskList.innerHTML = `
      <div class="empty-state">
        You don't have any assigned tasks yet.
      </div>
    `;

    return;
  }

  tasks.forEach(task => {
    const status =
      task.status ||
      (task.done ? "completed" : "todo");

    const priority =
      task.priority || "medium";

    const taskElement =
      document.createElement("article");

    taskElement.className =
      `employee-task status-${status}`;

    taskElement.dataset.id =
      task.taskId;

    taskElement.innerHTML = `
      <div class="employee-task-top">

        <div class="employee-task-content">

          <h3 class="employee-task-title">
            ${escapeHtml(task.title)}
          </h3>

          ${
            task.description
              ? `
                <p class="employee-task-description">
                  ${escapeHtml(task.description)}
                </p>
              `
              : ""
          }

          <div class="employee-task-meta">

            <span class="priority-badge priority-${priority}">
              ${escapeHtml(priority)}
            </span>

            <span class="status-badge status-badge-${status}">
              ${formatStatus(status)}
            </span>

          </div>

        </div>

        <div class="employee-task-actions">

          <select
            class="employee-status-select"
            data-id="${task.taskId}"
            aria-label="Change task status">

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
    `;

    taskList.appendChild(taskElement);
  });
}

/* ---------- Update Task Status ---------- */

taskList.addEventListener("change", async event => {
  const select =
    event.target.closest(".employee-status-select");

  if (!select) {
    return;
  }

  const taskId = select.dataset.id;
  const newStatus = select.value;

  select.disabled = true;

  try {
    const res = await employeeFetch(
      `${API_BASE_URL}/employee/tasks/${encodeURIComponent(taskId)}/status`,
      {
        method: "PUT",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          status: newStatus
        })
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(
        data.error || "Could not update task"
      );
    }

    showMessage(
      "Task status updated successfully.",
      "success"
    );

    await loadTasks();

  } catch (err) {
    console.error(err);

    if (err.message !== "Session expired") {
      showMessage(
        err.message || "Could not update task status."
      );

      await loadTasks();
    }

  } finally {
    select.disabled = false;
  }
});

/* ---------- Logout ---------- */

logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;
  logoutButton.textContent = "Logging out...";

  try {
    await fetch(
      `${API_BASE_URL}/auth/logout`,
      {
        method: "POST",

        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

  } catch (err) {
    console.error("Logout request failed:", err);
  }

  clearSession();
  window.location.replace("/login/");
});

/* ---------- Start Dashboard ---------- */

loadTasks();
