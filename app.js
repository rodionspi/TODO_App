const STORAGE_KEY = "todo-spa-items";

const form = document.getElementById("todo-form");
const submitBtn = document.getElementById("submit-btn");
const resetBtn = document.getElementById("reset-btn");
const todoList = document.getElementById("todo-list");
const emptyState = document.getElementById("empty-state");
const resultCount = document.getElementById("result-count");
const searchInput = document.getElementById("search");
const template = document.getElementById("todo-card-template");

const viewListBtn = document.getElementById("view-list-btn");
const viewCalendarBtn = document.getElementById("view-calendar-btn");
const calendarView = document.getElementById("calendar-view");
const calPrevBtn = document.getElementById("cal-prev");
const calNextBtn = document.getElementById("cal-next");
const calMonthYear = document.getElementById("cal-month-year");
const calendarGrid = document.getElementById("calendar-grid");

const titleInput = document.getElementById("title");
const descriptionInput = document.getElementById("description");
const authorInput = document.getElementById("author");
const categoryInput = document.getElementById("category");
const importantInput = document.getElementById("important");
const urgentInput = document.getElementById("urgent");
const priorityInput = document.getElementById("priority");
const startDateInput = document.getElementById("start-date");
const endDateInput = document.getElementById("end-date");
const progressInput = document.getElementById("progress");

let todos = loadTodos();
let editingId = null;
let searchQuery = "";
let isCalendarView = false;
let calDate = new Date();

// Load stored data from localStorage.
function loadTodos() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Unable to parse storage", error);
    return [];
  }
}

document.addEventListener("DOMContentLoaded", () => {
  todos = loadTodos();
  renderTodos(); 
});

// Persist the current list in localStorage.
function saveTodos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

// Compute the priority label based on important/urgent flags.
function computePriority(important, urgent) {
  if (important && urgent) {
    return { label: "Sofort erledigen", code: "A" };
  }
  if (important && !urgent) {
    return { label: "Einplanen und Wohlfuehlen", code: "B" };
  }
  if (!important && urgent) {
    return { label: "Gib es ab", code: "C" };
  }
  return { label: "Weg damit", code: "D" };
}

function setPriorityDisplay() {
  const priority = computePriority(importantInput.checked, urgentInput.checked);
  priorityInput.value = `${priority.code} - ${priority.label}`;
}

// Collect form values and normalize them.
function getFormData() {
  const typeValue = form.querySelector("input[name=\"todo-type\"]:checked")?.value;
  return {
    title: titleInput.value.trim(),
    type: typeValue || "",
    isEvent: typeValue === "event",
    description: descriptionInput.value.trim(),
    author: authorInput.value.trim(),
    category: categoryInput.value,
    important: importantInput.checked,
    urgent: urgentInput.checked,
    startDate: startDateInput.value,
    endDate: endDateInput.value,
    progressRaw: progressInput.value,
    progress: Number(progressInput.value),
  };
}

// Validate all fields and return error messages if needed.
function validateForm(data) {
  const errors = {};

  if (!data.title) {
    errors.title = "Title ist erforderlich.";
  } else if (data.title.length > 255) {
    errors.title = "Title darf maximal 255 Zeichen haben.";
  }

  if (!data.type) {
    errors.type = "Bitte Task oder Event waehlen.";
  }

  if (!data.description) {
    errors.description = "Beschreibung ist erforderlich.";
  }

  if (!data.author) {
    errors.author = "Autor ist erforderlich.";
  } else if (data.author.length > 20) {
    errors.author = "Autor darf maximal 20 Zeichen haben.";
  }

  if (!data.category) {
    errors.category = "Kategorie ist erforderlich.";
  }

  if (!data.startDate) {
    errors.startDate = "Startdatum ist erforderlich.";
  }

  if (!data.endDate) {
    errors.endDate = "Enddatum ist erforderlich.";
  }

  if (data.startDate && data.endDate && data.startDate > data.endDate) {
    errors.endDate = "Enddatum darf nicht vor dem Startdatum liegen.";
  }

  if (data.progressRaw === "") {
    errors.progress = "Fortschritt ist erforderlich.";
  } else if (!Number.isFinite(data.progress)) {
    errors.progress = "Fortschritt ist erforderlich.";
  } else if (data.progress < 0 || data.progress > 100) {
    errors.progress = "Fortschritt muss zwischen 0 und 100 liegen.";
  }

  return errors;
}

function clearErrors() {
  document.querySelectorAll("[data-error-for]").forEach((node) => {
    node.textContent = "";
  });
  form.querySelectorAll("[aria-invalid=true]").forEach((node) => {
    node.setAttribute("aria-invalid", "false");
  });
}

function showErrors(errors) {
  clearErrors();
  Object.entries(errors).forEach(([key, message]) => {
    const errorNode = document.querySelector(`[data-error-for="${key}"]`);
    if (errorNode) {
      errorNode.textContent = message;
    }
    const fieldMap = {
      title: titleInput,
      type: form.querySelector("input[name=\"todo-type\"]"),
      description: descriptionInput,
      author: authorInput,
      category: categoryInput,
      startDate: startDateInput,
      endDate: endDateInput,
      progress: progressInput,
    };
    const field = fieldMap[key];
    if (field) {
      field.setAttribute("aria-invalid", "true");
    }
  });
}

function resetFormState() {
  editingId = null;
  submitBtn.textContent = "TODO speichern";
  form.reset();
  clearErrors();
  setPriorityDisplay();
}

function startEdit(todo) {
  editingId = todo.id;
  submitBtn.textContent = "TODO aktualisieren";
  titleInput.value = todo.title;
  descriptionInput.value = todo.description;
  authorInput.value = todo.author;
  categoryInput.value = todo.category;
  importantInput.checked = todo.important;
  urgentInput.checked = todo.urgent;
  startDateInput.value = todo.startDate;
  endDateInput.value = todo.endDate;
  progressInput.value = todo.progress;
  const typeValue = todo.isEvent ? "event" : "task";
  const typeRadio = form.querySelector(
    `input[name="todo-type"][value="${typeValue}"]`
  );
  if (typeRadio) {
    typeRadio.checked = true;
  }
  setPriorityDisplay();
  clearErrors();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function buildTodoCard(todo) {
  const node = template.content.cloneNode(true);
  const article = node.querySelector(".todo-card");
  const title = node.querySelector(".todo-title");
  const meta = node.querySelector(".todo-meta");
  const description = node.querySelector(".todo-description");
  const tags = node.querySelector(".todo-tags");
  const dates = node.querySelector(".todo-dates");
  const progressBar = node.querySelector(".progress-bar");
  const progressLabel = node.querySelector(".progress-label");
  const priorityPill = node.querySelector(".priority-pill");

  const priority = computePriority(todo.important, todo.urgent);

  article.dataset.id = todo.id;
  title.textContent = todo.title;
  meta.textContent = `${todo.isEvent ? "Event" : "Task"} · ${todo.author}`;
  description.textContent = todo.description;

  const tagList = [
    `Kategorie: ${todo.category}`,
    todo.important ? "Wichtig" : "Nicht wichtig",
    todo.urgent ? "Dringend" : "Nicht dringend",
  ];
  tagList.forEach((tagText) => {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = tagText;
    tags.appendChild(tag);
  });

  const dateText = `Start: ${todo.startDate} · Ende: ${todo.endDate}`;
  dates.textContent = dateText;

  progressBar.style.width = `${todo.progress}%`;
  progressLabel.textContent = `${todo.progress}% erledigt`;

  priorityPill.textContent = `${priority.code} - ${priority.label}`;
  priorityPill.style.background = priority.code === "A"
    ? "#ff8b5e"
    : priority.code === "B"
    ? "#ffd166"
    : priority.code === "C"
    ? "#7ec8ff"
    : "#d3d6de";

  return node;
}

function renderTodos() {
  todoList.innerHTML = "";

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const visible = todos.filter((todo) => {
    if (!normalizedQuery) {
      return true;
    }
    const priority = computePriority(todo.important, todo.urgent);
    const haystack = [
      todo.title,
      todo.description,
      todo.author,
      todo.category,
      priority.label,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalizedQuery);
  });

  visible.forEach((todo) => {
    todoList.appendChild(buildTodoCard(todo));
  });

  if (isCalendarView) {
    todoList.hidden = true;
    calendarView.hidden = false;
    renderCalendar(visible);
    emptyState.hidden = true;
  } else {
    todoList.hidden = false;
    calendarView.hidden = true;
    emptyState.hidden = visible.length > 0;
  }

  if (normalizedQuery) {
    resultCount.textContent = `${visible.length} Treffer von ${todos.length}`;
  } else {
    resultCount.textContent = `${todos.length} TODOs`;
  }
}

function renderCalendar(visibleTodos) {
  const year = calDate.getFullYear();
  const month = calDate.getMonth();
  
  // Update Header
  const monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
  calMonthYear.textContent = `${monthNames[month]} ${year}`;

  calendarGrid.innerHTML = "";

  const firstDay = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Make Monday the first day of the week
  let startGrid = firstDay === 0 ? 6 : firstDay - 1;

  for (let i = 0; i < startGrid; i++) {
    const emptyDiv = document.createElement("div");
    emptyDiv.className = "calendar-day empty";
    calendarGrid.appendChild(emptyDiv);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dayDiv = document.createElement("div");
    dayDiv.className = "calendar-day";
    dayDiv.innerHTML = `<span class="day-num">${day}</span>`;

    const currentDateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const dayTasks = visibleTodos.filter(todo => {
      return todo.startDate <= currentDateStr && todo.endDate >= currentDateStr;
    });

    dayTasks.forEach(todo => {
      const priority = computePriority(todo.important, todo.urgent);
      const taskDiv = document.createElement("div");
      taskDiv.className = "calendar-task";
      taskDiv.textContent = todo.title;
      taskDiv.title = `${todo.title} (${todo.progress}%)`;

      taskDiv.style.background = priority.code === "A"
        ? "#ff8b5e"
        : priority.code === "B"
        ? "#ffd166"
        : priority.code === "C"
        ? "#7ec8ff"
        : "#d3d6de";
      
      if (priority.code === "B" || priority.code === "D") {
        taskDiv.style.color = "#1e1f1d";
      }

      taskDiv.addEventListener("click", () => {
        isCalendarView = false;
        viewListBtn.classList.add("active");
        viewListBtn.classList.remove("ghost");
        viewCalendarBtn.classList.add("ghost");
        viewCalendarBtn.classList.remove("active");
        renderTodos();
        startEdit(todo);
      });

      dayDiv.appendChild(taskDiv);
    });

    calendarGrid.appendChild(dayDiv);
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = getFormData();
  const errors = validateForm(data);

  if (Object.keys(errors).length > 0) {
    showErrors(errors);
    return;
  }

  const { progressRaw, ...todoData } = data;

  const now = new Date().toISOString();
  if (editingId) {
    const index = todos.findIndex((todo) => todo.id === editingId);
    if (index !== -1) {
      const existing = todos[index];
      todos[index] = {
        ...existing,
        ...todoData,
        updatedAt: now,
      };
    }
  } else {
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `todo-${Date.now()}`;
    todos.unshift({
      id,
      ...todoData,
      createdAt: now,
      updatedAt: now,
    });
  }

  saveTodos();
  resetFormState();
  renderTodos();
});

resetBtn.addEventListener("click", () => {
  resetFormState();
});

searchInput.addEventListener("input", (event) => {
  searchQuery = event.target.value;
  renderTodos();
});

importantInput.addEventListener("change", setPriorityDisplay);
urgentInput.addEventListener("change", setPriorityDisplay);

// Handle edit/delete buttons via event delegation.
todoList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }
  const card = button.closest(".todo-card");
  const id = card?.dataset.id;
  if (!id) {
    return;
  }
  const todo = todos.find((item) => item.id === id);
  if (!todo) {
    return;
  }

  if (button.dataset.action === "edit") {
    startEdit(todo);
    return;
  }

  if (button.dataset.action === "delete") {
    const confirmed = window.confirm(
      `TODO "${todo.title}" wirklich loeschen?`
    );
    if (!confirmed) {
      return;
    }
    todos = todos.filter((item) => item.id !== id);
    saveTodos();
    renderTodos();
  }
});

viewListBtn.addEventListener("click", () => {
  isCalendarView = false;
  viewListBtn.classList.add("active");
  viewListBtn.classList.remove("ghost");
  viewCalendarBtn.classList.add("ghost");
  viewCalendarBtn.classList.remove("active");
  renderTodos();
});

viewCalendarBtn.addEventListener("click", () => {
  isCalendarView = true;
  viewCalendarBtn.classList.add("active");
  viewCalendarBtn.classList.remove("ghost");
  viewListBtn.classList.add("ghost");
  viewListBtn.classList.remove("active");
  renderTodos();
});

calPrevBtn.addEventListener("click", () => {
  calDate.setMonth(calDate.getMonth() - 1);
  renderTodos();
});

calNextBtn.addEventListener("click", () => {
  calDate.setMonth(calDate.getMonth() + 1);
  renderTodos();
});

// Initial UI state.
setPriorityDisplay();
renderTodos();
