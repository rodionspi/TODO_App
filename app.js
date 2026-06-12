const STORAGE_KEY = "todo-spa-items";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("todo-form");
  const submitBtn = document.getElementById("submit-btn");
  const resetBtn = document.getElementById("reset-btn");
  const todoList = document.getElementById("todo-list");
  const emptyState = document.getElementById("empty-state");
  const resultCount = document.getElementById("result-count");
  const searchInput = document.getElementById("search");
  const template = document.getElementById("todo-card-template");

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

  const monthNames = [
    "Januar",
    "Februar",
    "Maerz",
    "April",
    "Mai",
    "Juni",
    "Juli",
    "August",
    "September",
    "Oktober",
    "November",
    "Dezember",
  ];

  let todos = loadTodos();
  let editingId = null;
  let searchQuery = "";
  let calendarDate = new Date();

  function loadTodos() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("Unable to parse storage", error);
      return [];
    }
  }

  function saveTodos() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    } catch (error) {
      console.error("Unable to save storage", error);
    }
  }

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

  function priorityClass(todo) {
    return `priority-${computePriority(todo.important, todo.urgent).code.toLowerCase()}`;
  }

  function setPriorityDisplay() {
    const priority = computePriority(importantInput.checked, urgentInput.checked);
    priorityInput.value = `${priority.code} - ${priority.label}`;
  }

  function toDateInputValue(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function dateFromInputValue(value) {
    return new Date(`${value}T00:00:00`);
  }

  function calendarMonthFromDateValue(value) {
    const date = dateFromInputValue(value);
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  function getFormData() {
    const typeValue = form.querySelector('input[name="todo-type"]:checked')?.value;
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
        type: form.querySelector('input[name="todo-type"]'),
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
    titleInput.value = todo.title || "";
    descriptionInput.value = todo.description || "";
    authorInput.value = todo.author || "";
    categoryInput.value = todo.category || "";
    importantInput.checked = Boolean(todo.important);
    urgentInput.checked = Boolean(todo.urgent);
    startDateInput.value = todo.startDate || "";
    endDateInput.value = todo.endDate || "";
    progressInput.value = todo.progress ?? 0;

    const typeValue = todo.isEvent || todo.type === "event" ? "event" : "task";
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

    dates.textContent = `Start: ${todo.startDate} · Ende: ${todo.endDate}`;
    progressBar.style.width = `${todo.progress}%`;
    progressLabel.textContent = `${todo.progress}% erledigt`;
    priorityPill.textContent = `${priority.code} - ${priority.label}`;
    priorityPill.classList.add(priorityClass(todo));

    return node;
  }

  function getVisibleTodos() {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return todos;
    }

    return todos.filter((todo) => {
      const priority = computePriority(todo.important, todo.urgent);
      const haystack = [
        todo.title,
        todo.description,
        todo.author,
        todo.category,
        todo.startDate,
        todo.endDate,
        priority.label,
        priority.code,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }

  function updateResultCount(visibleCount) {
    const normalizedQuery = searchQuery.trim();

    if (normalizedQuery) {
      resultCount.textContent = `${visibleCount} Treffer von ${todos.length}`;
      return;
    }

    resultCount.textContent = `${todos.length} TODOs`;
  }

  function updateEmptyState(visibleCount) {
    emptyState.textContent = todos.length
      ? "Keine TODOs fuer diese Suche gefunden."
      : "Noch keine TODOs. Fuege die erste Aufgabe hinzu.";
    emptyState.hidden = visibleCount > 0;
  }

  function isTodoOnDate(todo, dateValue) {
    return Boolean(
      todo.startDate &&
        todo.endDate &&
        todo.startDate <= dateValue &&
        todo.endDate >= dateValue
    );
  }

  function buildCalendarTask(todo) {
    const priority = computePriority(todo.important, todo.urgent);
    const task = document.createElement("button");
    task.type = "button";
    task.className = `calendar-task ${priorityClass(todo)}`;
    task.textContent = todo.title;
    task.title = `${todo.title} (${todo.progress}% erledigt)`;
    task.setAttribute(
      "aria-label",
      `${todo.title}, Prioritaet ${priority.code}, ${todo.progress}% erledigt`
    );
    task.addEventListener("click", () => startEdit(todo));

    return task;
  }

  function appendEmptyCalendarCell() {
    const emptyDiv = document.createElement("div");
    emptyDiv.className = "calendar-day empty";
    calendarGrid.appendChild(emptyDiv);
  }

  function renderCalendar(visibleTodos) {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const todayValue = toDateInputValue(new Date());
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const leadingEmptyCells = firstDay === 0 ? 6 : firstDay - 1;

    calendarView.hidden = false;
    calMonthYear.textContent = `${monthNames[month]} ${year}`;
    calendarGrid.innerHTML = "";

    for (let i = 0; i < leadingEmptyCells; i += 1) {
      appendEmptyCalendarCell();
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const currentDateValue = `${year}-${String(month + 1).padStart(
        2,
        "0"
      )}-${String(day).padStart(2, "0")}`;
      const dayTodos = visibleTodos.filter((todo) =>
        isTodoOnDate(todo, currentDateValue)
      );

      const dayCell = document.createElement("div");
      dayCell.className = "calendar-day";
      dayCell.setAttribute("aria-label", currentDateValue);

      if (currentDateValue === todayValue) {
        dayCell.classList.add("today");
      }

      if (dayTodos.length > 0) {
        dayCell.classList.add("has-tasks");
      }

      const dayNumber = document.createElement("span");
      dayNumber.className = "day-num";
      dayNumber.textContent = day;
      dayCell.appendChild(dayNumber);

      const tasksWrap = document.createElement("div");
      tasksWrap.className = "calendar-tasks";
      dayTodos.forEach((todo) => {
        tasksWrap.appendChild(buildCalendarTask(todo));
      });

      dayCell.appendChild(tasksWrap);
      calendarGrid.appendChild(dayCell);
    }

    const totalCells = leadingEmptyCells + daysInMonth;
    const trailingEmptyCells = (7 - (totalCells % 7)) % 7;
    for (let i = 0; i < trailingEmptyCells; i += 1) {
      appendEmptyCalendarCell();
    }
  }

  function renderTodos() {
    const visibleTodos = getVisibleTodos();
    todoList.innerHTML = "";

    visibleTodos.forEach((todo) => {
      todoList.appendChild(buildTodoCard(todo));
    });

    updateEmptyState(visibleTodos.length);
    updateResultCount(visibleTodos.length);
    renderCalendar(visibleTodos);
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
        todos[index] = {
          ...todos[index],
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

    calendarDate = calendarMonthFromDateValue(todoData.startDate);
    saveTodos();
    resetFormState();
    renderTodos();
  });

  resetBtn.addEventListener("click", (event) => {
    event.preventDefault();
    resetFormState();
  });

  searchInput.addEventListener("input", (event) => {
    searchQuery = event.target.value;
    renderTodos();
  });

  importantInput.addEventListener("change", setPriorityDisplay);
  urgentInput.addEventListener("change", setPriorityDisplay);

  todoList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) {
      return;
    }

    const card = button.closest(".todo-card");
    const id = card?.dataset.id;
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

  calPrevBtn.addEventListener("click", () => {
    calendarDate = new Date(
      calendarDate.getFullYear(),
      calendarDate.getMonth() - 1,
      1
    );
    renderTodos();
  });

  calNextBtn.addEventListener("click", () => {
    calendarDate = new Date(
      calendarDate.getFullYear(),
      calendarDate.getMonth() + 1,
      1
    );
    renderTodos();
  });

  setPriorityDisplay();
  renderTodos();
});
