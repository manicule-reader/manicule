const username = document.getElementById("username");
const logoutButton = document.getElementById("logout-button");
const createGroupButton = document.getElementById("create-group-button");
const groupsList = document.getElementById("groups-list");
const groupsError = document.getElementById("groups-error");

async function loadCurrentUser() {
  const response = await fetch("/api/auth/me");

  if (response.status === 401) {
    window.location.href = "/login";
    return;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Unable to load user");
  }

  username.textContent = data.user.username;
}

async function loadGroups() {
  const response = await fetch("/api/groups");

  if (response.status === 401) {
    window.location.href = "/login";
    return;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Unable to load groups");
  }

  groupsList.replaceChildren();

  if (data.groups.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.textContent = "You haven't joined any groups yet.";
    groupsList.appendChild(emptyMessage);
    return;
  }

  for (const group of data.groups) {
    const groupLink = document.createElement("a");
    groupLink.className = "group-row";
    groupLink.href = `/read/${group.book_id}/1?group=${group.id}`;

    const details = document.createElement("div");

    const name = document.createElement("strong");
    name.textContent = group.name;

    const book = document.createElement("span");
    book.textContent = group.book_title;

    details.append(name, book);

    const members = document.createElement("span");
    members.textContent =
      `${group.member_count} ${group.member_count === 1 ? "member" : "members"}`;

    groupLink.append(details, members);
    groupsList.appendChild(groupLink);
  }
}

async function loadPage() {
  groupsError.textContent = "";

  try {
    await Promise.all([
      loadCurrentUser(),
      loadGroups(),
    ]);
  } catch (error) {
    console.error("My Groups error:", error);
    groupsError.textContent = error.message;
  }
}

logoutButton.addEventListener("click", async () => {
  try {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Unable to log out");
    }

    window.location.href = "/login";
  } catch (error) {
    console.error("Logout error:", error);
    groupsError.textContent = error.message;
  }
});

createGroupButton.addEventListener("click", () => {
  groupsError.textContent =
    "Group creation will be available from the Library.";
});

loadPage();