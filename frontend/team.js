const memberForm = document.getElementById("member-form");
const memberList = document.getElementById("member-list");
const memberCount = document.getElementById("member-count");
const memberMessage = document.getElementById("member-message");
const createButton = document.getElementById("create-member-button");

const token = sessionStorage.getItem("taskManagerToken");

let currentUser = null;

try {
  currentUser = JSON.parse(
    sessionStorage.getItem("taskManagerUser") || "null"
  );
} catch {
  currentUser = null;
}

/* ---------- Protect admin page ---------- */

if (!token || !currentUser || currentUser.role !== "admin") {
  window.location.replace("/login/");
}

/* ---------- Helpers ---------- */

function showMessage(message, type = "success") {
  memberMessage.textContent = message;

  memberMessage.style.color =
    type === "error" ? "#c62828" : "#2e7d32";

  setTimeout(() => {
    memberMessage.textContent = "";
  }, 4000);
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value || "";
  return div.innerHTML;
}

async function authenticatedFetch(url, options = {}) {
  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`
  };

  const res = await fetch(url, {
    ...options,
    headers
  });

  if (res.status === 401 || res.status === 403) {
    sessionStorage.removeItem("taskManagerToken");
    sessionStorage.removeItem("taskManagerUser");

    window.location.replace("/login/");

    throw new Error("Session expired");
  }

  return res;
}

/* ---------- Load employees ---------- */

async function loadMembers() {
  try {
    memberList.innerHTML = `
      <p class="empty-members">
        Loading employees...
      </p>
    `;

    const res = await authenticatedFetch(
      `${API_BASE_URL}/team-members`
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(
        data.error || "Could not load employees"
      );
    }

    renderMembers(data.members || []);

  } catch (err) {
    console.error(err);

    memberList.innerHTML = `
      <p class="empty-members">
        Could not load employees.
      </p>
    `;
  }
}

/* ---------- Display employees ---------- */

function renderMembers(members) {
  memberCount.textContent =
    `${members.length} ${members.length === 1 ? "Member" : "Members"}`;

  if (members.length === 0) {
    memberList.innerHTML = `
      <p class="empty-members">
        No employees yet.
      </p>
    `;
    return;
  }

  memberList.innerHTML = "";

  members.forEach(member => {
    const item = document.createElement("div");

    item.className = "member-item";

    item.innerHTML = `
      <div class="member-info">

        <strong>
          ${escapeHtml(member.name)}
        </strong>

        <span>
          @${escapeHtml(member.username)}
        </span>

        ${
          member.email
            ? `<span>${escapeHtml(member.email)}</span>`
            : ""
        }

      </div>

      <button
        type="button"
        class="member-delete"
        data-username="${escapeHtml(member.username)}">
        Remove
      </button>
    `;

    memberList.appendChild(item);
  });
}

/* ---------- Create employee ---------- */

memberForm.addEventListener("submit", async event => {
  event.preventDefault();

  const name =
    document.getElementById("member-name").value.trim();

  const username =
    document.getElementById("member-username")
      .value
      .trim()
      .toLowerCase();

  const email =
    document.getElementById("member-email").value.trim();

  const password =
    document.getElementById("member-password").value;

  if (!name || !username || !password) {
    showMessage(
      "Name, username and password are required.",
      "error"
    );

    return;
  }

  if (password.length < 8) {
    showMessage(
      "Password must contain at least 8 characters.",
      "error"
    );

    return;
  }

  createButton.disabled = true;
  createButton.textContent = "Creating...";

  try {
    const res = await authenticatedFetch(
      `${API_BASE_URL}/team-members`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          name,
          username,
          email,
          password
        })
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(
        data.error || "Could not create employee"
      );
    }

    memberForm.reset();

    showMessage("Employee created successfully.");

    await loadMembers();

  } catch (err) {
    console.error(err);

    if (err.message !== "Session expired") {
      showMessage(
        err.message || "Could not create employee.",
        "error"
      );
    }

  } finally {
    createButton.disabled = false;
    createButton.textContent = "Create Employee";
  }
});

/* ---------- Delete employee ---------- */

memberList.addEventListener("click", async event => {
  const button = event.target.closest(".member-delete");

  if (!button) {
    return;
  }

  const username = button.dataset.username;

  const confirmed = confirm(
    `Remove employee "${username}"?`
  );

  if (!confirmed) {
    return;
  }

  button.disabled = true;
  button.textContent = "Removing...";

  try {
    const res = await authenticatedFetch(
      `${API_BASE_URL}/team-members/${encodeURIComponent(username)}`,
      {
        method: "DELETE"
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(
        data.error || "Could not remove employee"
      );
    }

    showMessage("Employee removed successfully.");

    await loadMembers();

  } catch (err) {
    console.error(err);

    if (err.message !== "Session expired") {
      showMessage(
        err.message || "Could not remove employee.",
        "error"
      );
    }

    button.disabled = false;
    button.textContent = "Remove";
  }
});

/* ---------- Start ---------- */

loadMembers();
