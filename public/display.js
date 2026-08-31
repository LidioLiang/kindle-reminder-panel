(function () {
  var title = document.getElementById("page-title");
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".tab-button"));
  var views = Array.prototype.slice.call(document.querySelectorAll(".view"));
  var page = document.body;
  var currentScript = document.currentScript;
  var panelSource = currentScript ? currentScript.getAttribute("data-panel-source") : "";
  var todoList = document.querySelector(".todo-list");
  var todoSummary = document.getElementById("todo-summary");
  var whiteboard = document.getElementById("whiteboard");

  page.classList.add("chrome-hidden");

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function sanitizeRichHtml(html) {
    return String(html || "")
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
      .replace(/\son\w+="[^"]*"/gi, "")
      .replace(/\son\w+='[^']*'/gi, "")
      .replace(/javascript:/gi, "")
      .replace(/(["'(])\/uploads\//g, "$1uploads/");
  }

  function sortTodos(todos) {
    return todos.slice().sort(function (a, b) {
      return Number(Boolean(a.done)) - Number(Boolean(b.done));
    });
  }

  function renderTodoItems(todos) {
    return sortTodos(todos).map(function (todo) {
      var done = todo.done ? " done" : "";
      var checked = todo.done ? "true" : "false";
      return [
        '<li class="todo-item' + done + '">',
        '<button class="todo-check" type="button" aria-label="完成状态" aria-checked="' + checked + '" disabled></button>',
        "<div>",
        '<p class="todo-text">' + escapeHtml(todo.title || "未命名提醒事项") + "</p>",
        '<p class="todo-note">' + escapeHtml(todo.note || "") + "</p>",
        "</div>",
        "</li>"
      ].join("");
    }).join("");
  }

  function renderPanel(data) {
    var todos = Array.isArray(data && data.todos) ? data.todos : [];
    if (todoList) {
      todoList.innerHTML = renderTodoItems(todos);
    }
    if (todoSummary) {
      todoSummary.textContent = todos.length + " 件提醒";
    }
    if (whiteboard) {
      whiteboard.innerHTML = sanitizeRichHtml(data && data.whiteboardHtml);
    }
  }

  function loadStaticPanel() {
    if (!panelSource) {
      return;
    }

    fetch(panelSource, { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Cannot load panel data");
        }
        return response.json();
      })
      .then(renderPanel)
      .catch(function () {
        if (whiteboard && !whiteboard.innerHTML.trim()) {
          whiteboard.innerHTML = "<p>暂时没有读取到提醒内容。</p>";
        }
      });
  }

  function showChrome() {
    page.classList.remove("chrome-hidden");
  }

  function hideChrome() {
    page.classList.add("chrome-hidden");
  }

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function (event) {
      event.stopPropagation();
      tabs.forEach(function (item) {
        item.classList.remove("active");
      });
      views.forEach(function (view) {
        view.classList.remove("active");
      });

      tab.classList.add("active");
      document.getElementById(tab.getAttribute("data-target")).classList.add("active");
      title.textContent = tab.getAttribute("data-title");
      showChrome();
    });
  });

  loadStaticPanel();

  document.addEventListener("click", function (event) {
    if (event.target.closest(".tabbar")) {
      return;
    }

    if (page.classList.contains("chrome-hidden")) {
      showChrome();
    } else {
      hideChrome();
    }
  });
})();
