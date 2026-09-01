(function () {
  var cacheBuster = new Date().getTime();
  var endpoints = [
    "https://raw.githubusercontent.com/LidioLiang/kindle-reminder-panel/main/docs/panel.json?t=" + cacheBuster,
    "panel.json?t=" + cacheBuster
  ];
  var title = document.getElementById("page-title");
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".tab-button"));
  var views = Array.prototype.slice.call(document.querySelectorAll(".view"));
  var page = document.body;
  var todoList = document.querySelector(".todo-list");
  var todoSummary = document.getElementById("todo-summary");
  var whiteboard = document.getElementById("whiteboard");

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
      .replace(/javascript:/gi, "");
  }

  function sortTodos(todos) {
    return todos.slice().sort(function (a, b) {
      return Number(Boolean(a.done)) - Number(Boolean(b.done));
    });
  }

  function renderPanel(row) {
    var todos = row && Array.isArray(row.todos) ? row.todos : [];
    todoList.innerHTML = sortTodos(todos).map(function (todo) {
      var done = todo.done ? " done" : "";
      var checked = todo.done ? "true" : "false";
      return '<li class="todo-item' + done + '">' +
        '<button class="todo-check" type="button" aria-label="完成状态" aria-checked="' + checked + '" disabled></button>' +
        '<div><p class="todo-text">' + escapeHtml(todo.title || "未命名提醒事项") + '</p>' +
        '<p class="todo-note">' + escapeHtml(todo.note || "") + '</p></div></li>';
    }).join("");
    todoSummary.textContent = todos.length + " 件提醒";
    whiteboard.innerHTML = sanitizeRichHtml(row && row.whiteboardHtml) || "<p>自由白板暂无内容。</p>";
  }

  function showLoadError() {
    whiteboard.innerHTML = "<p>暂时没有读取到提醒内容，请稍后刷新。</p>";
  }

  function loadPanel(endpointIndex) {
    if (endpointIndex >= endpoints.length) {
      showLoadError();
      return;
    }

    var request = new XMLHttpRequest();
    request.open("GET", endpoints[endpointIndex], true);
    request.onreadystatechange = function () {
      if (request.readyState !== 4) return;
      if (request.status >= 200 && request.status < 300) {
        try {
          renderPanel(JSON.parse(request.responseText));
        } catch (error) {
          loadPanel(endpointIndex + 1);
        }
      } else {
        loadPanel(endpointIndex + 1);
      }
    };
    request.send();
  }

  function showChrome() { page.classList.remove("chrome-hidden"); }
  function hideChrome() { page.classList.add("chrome-hidden"); }

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function (event) {
      event.stopPropagation();
      tabs.forEach(function (item) { item.classList.remove("active"); });
      views.forEach(function (view) { view.classList.remove("active"); });
      tab.classList.add("active");
      document.getElementById(tab.getAttribute("data-target")).classList.add("active");
      title.textContent = tab.getAttribute("data-title");
      showChrome();
    });
  });

  document.addEventListener("click", function (event) {
    if (event.target.closest && event.target.closest(".tabbar")) return;
    if (page.classList.contains("chrome-hidden")) showChrome();
    else hideChrome();
  });

  loadPanel(0);
})();
