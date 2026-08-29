const memberForm = document.getElementById("member-form");
const memberList = document.getElementById("member-list");
const memberCount = document.getElementById("member-count");
const memberMessage = document.getElementById("member-message");

let members = [];

function showMessage(message, type = "success") {
  memberMessage.textContent = message;
  memberMessage.style.color = type === "error" ? "#c62828" : "#2e7d32";

  setTimeout(() => {
    memberMessage.textContent = "";
  }, 4000);
}

function renderMembers() {
  memberCount.textContent = `${members.length} ${members.length === 1 ? "Member" : "Members"}`;

  if (members.length === 0) {
    memberList.innerHTML = `
      <p class="empty-members">
        No team members yet.
      </p>
    `;
    return;
  }

  memberList.innerHTML = "";

  members.forEach(member => {
    const div = document.createElement("div");
    div.className = "member-item";

    div.innerHTML = `
      <div class="member-info">
        <strong>${escapeHtml(member.name)}</strong>
        <span>${escapeHtml(member.email)}</span>
      </div>

      <button
        class="member-delete"
        data-id="${member.id}">
        Remove
      </button>
    `;

    memberList.appendChild(div);
  });
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value || "";
  return div.innerHTML;
}

memberForm.addEventListener("submit", e => {
  e.preventDefault();

  const name = document.getElementById("member-name").value.trim();
  const email = document.getElementById("member-email").value.trim();

  if (!name || !email) {
    showMessage("Please enter name and email.", "error");
    return;
  }

  const existingMember = members.find(
    member => member.email.toLowerCase() === email.toLowerCase()
  );

  if (existingMember) {
    showMessage("A member with this email already exists.", "error");
    return;
  }

  const member = {
    id: crypto.randomUUID(),
    name,
    email
  };

  members.push(member);

  memberForm.reset();
  renderMembers();
  showMessage("Team member added.");
});

memberList.addEventListener("click", e => {
  const button = e.target.closest(".member-delete");

  if (!button) return;

  const id = button.dataset.id;

  members = members.filter(member => member.id !== id);

  renderMembers();
  showMessage("Team member removed.");
});

renderMembers();
