
var tasks = [];
var profile = { name: "Your Name", email: "you@gmail.com", photo: "" };
var currentFilter = "all";   
var searchText = "";
var editingId = null;          
var pendingPhoto = "";         
var messageTimer = null;


function saveTasks() {
  try {
    localStorage.setItem("taskflow-tasks", JSON.stringify(tasks));
  } catch (error) {
    showMessage("Could not save tasks. Browser storage may be full.", true);
  }
}

function loadTasks() {
  try {
    var saved = JSON.parse(localStorage.getItem("taskflow-tasks"));
    if (Array.isArray(saved)) {
      tasks = saved;
    }
  } catch (error) {
    tasks = [];
  }
}

function saveProfile() {
  try {
    localStorage.setItem("taskflow-profile", JSON.stringify(profile));
    return true;
  } catch (error) {
    return false;
  }
}

function loadProfile() {
  try {
    var saved = JSON.parse(localStorage.getItem("taskflow-profile"));
    if (saved && typeof saved === "object") {
      profile.name = saved.name || profile.name;
      profile.email = saved.email || profile.email;
      profile.photo = saved.photo || "";
    }
  } catch (error) {

  }
  showProfile();
}


var pageInfo = {
  home: { title: "Home", subtitle: "Your productivity overview." },
  tasks: { title: "Tasks", subtitle: "Add, complete, edit and delete your tasks." },
  settings: { title: "Settings", subtitle: "Manage theme, profile and data." }
};

function showPage(pageName) {
  var area = document.querySelector("#page-area");

  area.classList.remove("pop-in");
  area.classList.add("pre-pop");

  var pages = document.querySelectorAll(".page");
  for (var i = 0; i < pages.length; i++) {
    pages[i].hidden = pages[i].id !== "page-" + pageName;
  }

  // 3. update heading and active nav button
  document.querySelector("#page-title").textContent = pageInfo[pageName].title;
  document.querySelector("#page-subtitle").textContent = pageInfo[pageName].subtitle;
  var navItems = document.querySelectorAll(".nav-item");
  for (var j = 0; j < navItems.length; j++) {
    navItems[j].classList.toggle("active", navItems[j].dataset.page === pageName);
  }


  void area.offsetWidth;
  area.classList.remove("pre-pop");
  area.classList.add("pop-in");

  document.body.classList.remove("menu-open"); 
}


function addTask() {
  var input = document.querySelector("#task-input");
  var title = input.value.trim();
  if (title === "") {
    showMessage("Type a task title first.", true);
    return;
  }
  tasks.push({ id: Date.now(), title: title, completed: false, createdAt: Date.now(), completedAt: null });
  input.value = "";
  saveTasks();
  renderTasks();
  showMessage("Task added.", false);
}

function findTask(id) {
  for (var i = 0; i < tasks.length; i++) {
    if (tasks[i].id === id) { return tasks[i]; }
  }
  return null;
}


function toggleTask(id) {
  var task = findTask(id);
  if (!task) { return; }
  task.completed = !task.completed;
  task.completedAt = task.completed ? Date.now() : null;
  saveTasks();
  renderTasks();
}

function startEdit(id) {
  editingId = id;
  renderTasks();
}

function cancelEdit() {
  editingId = null;
  renderTasks();
}

function saveEdit(id, newTitle) {
  var title = newTitle.trim();
  if (title === "") {
    showMessage("A task title cannot be empty.", true);
    return;
  }
  findTask(id).title = title;
  editingId = null;
  saveTasks();
  renderTasks();
  showMessage("Task updated.", false);
}

function deleteTask(id) {
  if (!confirm("Delete this task?")) { return; }
  tasks = tasks.filter(function (task) { return task.id !== id; });
  saveTasks();
  renderTasks();
  showMessage("Task deleted.", false);
}

function clearAllTasks() {
  if (!confirm("Delete ALL tasks? Your profile and theme will stay.")) { return; }
  tasks = [];
  editingId = null;
  saveTasks();
  renderTasks();
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

// Build one <li> for a task
function createTaskItem(task, simple) {
  var li = document.createElement("li");
  li.className = "task-item" + (task.completed ? " done" : "");

  var checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = task.completed;
  checkbox.setAttribute("aria-label", "Mark \"" + task.title + "\" as done");
  checkbox.addEventListener("change", function () { toggleTask(task.id); });
  li.appendChild(checkbox);

  var body = document.createElement("div");
  body.className = "task-body";
  var actions = document.createElement("div");
  actions.className = "task-actions";

  if (editingId === task.id && !simple) {
    // Edit mode: input + Save + Cancel
    var editInput = document.createElement("input");
    editInput.type = "text";
    editInput.value = task.title;
    editInput.setAttribute("aria-label", "Edit task title");
    editInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { saveEdit(task.id, editInput.value); }
      if (e.key === "Escape") { cancelEdit(); }
    });
    body.appendChild(editInput);
    actions.appendChild(makeButton("Save", function () { saveEdit(task.id, editInput.value); }, "glow"));
    actions.appendChild(makeButton("Cancel", cancelEdit, ""));
    setTimeout(function () { editInput.focus(); }, 0);
  } else {
    var title = document.createElement("span");
    title.className = "task-title";
    title.textContent = task.title;
    var time = document.createElement("span");
    time.className = "task-time";
    time.textContent = task.completed ? "Completed " + formatTime(task.completedAt) : "Created " + formatTime(task.createdAt);
    body.appendChild(title);
    body.appendChild(time);
    if (!simple) {
      actions.appendChild(makeButton("Edit", function () { startEdit(task.id); }, ""));
      actions.appendChild(makeButton("Delete", function () { deleteTask(task.id); }, "danger"));
    }
  }
  li.appendChild(body);
  li.appendChild(actions);
  return li;
}

function makeButton(label, onClick, extraClass) {
  var button = document.createElement("button");
  button.className = "btn " + extraClass;
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function addEmptyMessage(list, text) {
  var li = document.createElement("li");
  li.className = "empty";
  li.textContent = text;
  list.appendChild(li);
}

// Redraw the Tasks page and Home list from the tasks array
function renderTasks() {
  var pendingList = document.querySelector("#pending-list");
  var completedList = document.querySelector("#completed-list");
  pendingList.innerHTML = "";
  completedList.innerHTML = "";

  var query = searchText.toLowerCase();
  var pendingCount = 0;
  var completedCount = 0;

  for (var i = 0; i < tasks.length; i++) {
    var task = tasks[i];
    if (query !== "" && task.title.toLowerCase().indexOf(query) === -1) { continue; } // search
    if (task.completed) {
      completedList.appendChild(createTaskItem(task, false));
      completedCount++;
    } else {
      pendingList.appendChild(createTaskItem(task, false));
      pendingCount++;
    }
  }

  // Empty states
  if (tasks.length === 0) {
    addEmptyMessage(pendingList, "No tasks yet. Add your first one above.");
  } else if (query !== "" && pendingCount === 0 && completedCount === 0) {
    addEmptyMessage(pendingList, "No tasks match \"" + searchText + "\".");
  } else {
    if (pendingCount === 0) { addEmptyMessage(pendingList, "No pending tasks. Nice work!"); }
    if (completedCount === 0) { addEmptyMessage(completedList, "No completed tasks yet."); }
  }

  // Filter only hides panels; it never changes task data
  document.querySelector("#pending-panel").hidden = currentFilter === "completed";
  document.querySelector("#completed-panel").hidden = currentFilter === "pending";

  renderHomeList();
  updateStats();
}

// Home: up to 5 pending tasks
function renderHomeList() {
  var list = document.querySelector("#home-list");
  list.innerHTML = "";
  var shown = 0;
  for (var i = 0; i < tasks.length && shown < 5; i++) {
    if (!tasks[i].completed) {
      list.appendChild(createTaskItem(tasks[i], true));
      shown++;
    }
  }
  if (shown === 0) {
    addEmptyMessage(list, tasks.length === 0 ? "No tasks yet. Add one in Tasks." : "All caught up!");
  }
}


function updateStats() {
  var total = tasks.length;
  var completed = tasks.filter(function (task) { return task.completed; }).length;
  var pending = total - completed;
  var rate = total === 0 ? 0 : Math.round((completed / total) * 100);

  setAll(".stat-total", total);
  setAll(".stat-pending", pending);
  setAll(".stat-completed", completed);
  setAll(".stat-rate", rate + "%");
  document.querySelector("#progress-fill").style.width = rate + "%";
  document.querySelector(".progress").setAttribute("aria-valuenow", rate);
}

function setAll(selector, value) {
  var elements = document.querySelectorAll(selector);
  for (var i = 0; i < elements.length; i++) { elements[i].textContent = value; }
}

function showMessage(text, isError) {
  var box = document.querySelector("#message");
  box.textContent = text;
  box.classList.toggle("error", isError);
  clearTimeout(messageTimer);
  messageTimer = setTimeout(function () { box.textContent = ""; }, 2500);
}


function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try { localStorage.setItem("taskflow-theme", theme); } catch (error) {}
  var button = document.querySelector("#theme-btn");
  button.setAttribute("aria-label", theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
  // sun icon in dark mode, moon icon in light mode
  document.querySelector("#theme-icon").innerHTML = theme === "dark"
    ? '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>'
    : '<path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z"/>';
}

function toggleTheme() {
  var current = document.documentElement.getAttribute("data-theme");
  setTheme(current === "light" ? "dark" : "light");
}

function loadTheme() {
  var saved = null;
  try { saved = localStorage.getItem("taskflow-theme"); } catch (error) {}
  setTheme(saved === "light" ? "light" : "dark"); // dark is the default
}
//profile
function getInitials(name) {
  var parts = name.trim().split(" ");
  var letters = parts[0].charAt(0);
  if (parts.length > 1) { letters += parts[parts.length - 1].charAt(0); }
  return letters.toUpperCase();
}


function drawAvatar(element, photo, name) {
  if (photo) {
    element.style.backgroundImage = "url(" + photo + ")";
    element.textContent = "";
  } else {
    element.style.backgroundImage = "none";
    element.textContent = getInitials(name || "?");
  }
}


function showProfile() {
  drawAvatar(document.querySelector("#sidebar-avatar"), profile.photo, profile.name);
  document.querySelector("#sidebar-name").textContent = profile.name;
  document.querySelector("#sidebar-email").textContent = profile.email;
  document.querySelector("#welcome-name").textContent = profile.name.split(" ")[0];
}

function openProfile() {
  pendingPhoto = profile.photo;
  document.querySelector("#name-input").value = profile.name;
  document.querySelector("#email-input").value = profile.email;
  document.querySelector("#profile-message").textContent = "";
  drawAvatar(document.querySelector("#modal-avatar"), pendingPhoto, profile.name);
  document.querySelector("#overlay").hidden = false;
  document.querySelector("#profile-modal").hidden = false;
  document.querySelector("#name-input").focus();
}

function closeProfile() {
  document.querySelector("#overlay").hidden = true;
  document.querySelector("#profile-modal").hidden = true;
}

function profileError(text) {
  var box = document.querySelector("#profile-message");
  box.textContent = text;
  box.classList.add("error");
}


function previewPhoto(event) {
  var file = event.target.files[0];
  if (!file) { return; }
  var allowed = ["image/png", "image/jpeg", "image/webp"];
  if (allowed.indexOf(file.type) === -1) {
    profileError("Please choose a PNG, JPG or WebP image.");
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    profileError("Image is too large. Maximum size is 2 MB.");
    return;
  }
  var reader = new FileReader();
  reader.onload = function () {
    pendingPhoto = reader.result; // a long text (data URL) that holds the image
    document.querySelector("#profile-message").textContent = "";
    drawAvatar(document.querySelector("#modal-avatar"), pendingPhoto, document.querySelector("#name-input").value);
  };
  reader.onerror = function () { profileError("Could not read that file."); };
  reader.readAsDataURL(file);
}

function saveProfileFromForm() {
  var name = document.querySelector("#name-input").value.trim();
  var email = document.querySelector("#email-input").value.trim();
  if (name === "") { profileError("Please enter a name."); return; }
  if (email.indexOf("@") === -1) { profileError("Please enter a valid email."); return; }

  var oldProfile = { name: profile.name, email: profile.email, photo: profile.photo };
  profile.name = name;
  profile.email = email;
  profile.photo = pendingPhoto;

  if (!saveProfile()) {
    // storage : undo 
    profile = oldProfile;
    profileError("Could not save: browser storage is full. Try a smaller photo.");
    return;
  }
  showProfile();
  closeProfile();
}


function setupEvents() {
  
  var navItems = document.querySelectorAll(".nav-item");
  for (var i = 0; i < navItems.length; i++) {
    navItems[i].addEventListener("click", function (e) { showPage(e.currentTarget.dataset.page); });
  }
  document.querySelector("#go-tasks-btn").addEventListener("click", function () { showPage("tasks"); });

  // Sidebar collapse and mobile menu
  document.querySelector("#collapse-btn").addEventListener("click", function () { document.body.classList.toggle("collapsed"); });
  document.querySelector("#menu-btn").addEventListener("click", function () { document.body.classList.toggle("menu-open"); });
  document.querySelector("#promo-btn").addEventListener("click", function () { showPage("tasks"); document.querySelector("#task-input").focus(); });

  // Add task
  document.querySelector("#add-btn").addEventListener("click", addTask);
  document.querySelector("#task-input").addEventListener("keydown", function (e) { if (e.key === "Enter") { addTask(); } });
  document.querySelector("#top-add-btn").addEventListener("click", function () { showPage("tasks"); document.querySelector("#task-input").focus(); });

  // Search 
  document.querySelector("#search-input").addEventListener("input", function (e) {
    searchText = e.target.value.trim();
    if (document.querySelector("#page-tasks").hidden) { showPage("tasks"); }
    renderTasks();
  });

  // Filters
  var chips = document.querySelectorAll(".chip");
  for (var j = 0; j < chips.length; j++) {
    chips[j].addEventListener("click", function (e) {
      currentFilter = e.currentTarget.dataset.filter;
      for (var k = 0; k < chips.length; k++) { chips[k].classList.toggle("active", chips[k] === e.currentTarget); }
      renderTasks();
    });
  }

  // Theme
  document.querySelector("#theme-btn").addEventListener("click", toggleTheme);
  document.querySelector("#settings-theme-btn").addEventListener("click", toggleTheme);

  // Settings
  document.querySelector("#clear-btn").addEventListener("click", clearAllTasks);
  document.querySelector("#settings-profile-btn").addEventListener("click", openProfile);

  // Profile dialog
  document.querySelector("#account-btn").addEventListener("click", openProfile);
  document.querySelector("#upload-btn").addEventListener("click", function () { document.querySelector("#photo-input").click(); });
  document.querySelector("#photo-input").addEventListener("change", previewPhoto);
  document.querySelector("#save-profile-btn").addEventListener("click", saveProfileFromForm);
  document.querySelector("#cancel-profile-btn").addEventListener("click", closeProfile);
  document.querySelector("#overlay").addEventListener("click", closeProfile);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !document.querySelector("#profile-modal").hidden) { closeProfile(); } });
}

// function calls
loadTheme();
loadTasks();
loadProfile();
setupEvents();
renderTasks();
showPage("home");
