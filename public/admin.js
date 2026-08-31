(function () {
  var title = document.getElementById("page-title");
  var editToggle = document.getElementById("edit-toggle");
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".tab-button"));
  var views = Array.prototype.slice.call(document.querySelectorAll(".view"));

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      tabs.forEach(function (item) {
        item.classList.remove("active");
      });
      views.forEach(function (view) {
        view.classList.remove("active");
      });

      tab.classList.add("active");
      document.getElementById(tab.getAttribute("data-target")).classList.add("active");
      title.textContent = tab.getAttribute("data-title");
      editToggle.classList.toggle("visible", tab.getAttribute("data-target") === "board-view");
      if (tab.getAttribute("data-target") !== "board-view") {
        setWhiteboardEditing(false);
      }
    });
  });
})();

var saveTimer = null;
var saveStatus = document.getElementById("save-status");
var todoList = document.querySelector(".todo-list");
var todoSummary = document.getElementById("todo-summary");
var board = document.getElementById("whiteboard");
var boardView = document.getElementById("board-view");
var tools = document.querySelector(".tools");
var editToggle = document.getElementById("edit-toggle");
var publishButton = document.getElementById("publish-button");
var publishStatus = document.getElementById("publish-status");

function setStatus(text) {
  if (saveStatus) {
    saveStatus.textContent = text;
  }
}

function setPublishStatus(text) {
  if (publishStatus) {
    publishStatus.textContent = text;
  }
}

function plainText(element) {
  return (element.textContent || "").replace(/\s+/g, " ").trim();
}

function collectData() {
  return {
    todos: Array.prototype.map.call(todoList.querySelectorAll(".todo-item"), function (item) {
      return {
        title: plainText(item.querySelector(".todo-text")) || "未命名提醒事项",
        note: plainText(item.querySelector(".todo-note")),
        done: item.classList.contains("done")
      };
    }),
    whiteboardHtml: board.innerHTML
  };
}

function saveNow() {
  window.clearTimeout(saveTimer);
  setStatus("保存中");
  return fetch("/api/panel", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(collectData())
  })
    .then(function (response) {
      if (!response.ok) {
        throw new Error("Save failed");
      }
      setStatus("已保存");
    })
    .catch(function () {
      setStatus("保存失败");
    });
}

function publishNow() {
  if (!publishButton) {
    return;
  }

  publishButton.disabled = true;
  setPublishStatus("正在同步");
  saveNow()
    .then(function () {
      return fetch("/api/publish", {
        method: "POST"
      });
    })
    .then(function (response) {
      if (!response.ok) {
        throw new Error("Publish failed");
      }
      return response.json();
    })
    .then(function (result) {
      setPublishStatus(result.changed ? "已同步，Kindle 刷新可见" : "内容无变化");
    })
    .catch(function () {
      setPublishStatus("同步失败");
    })
    .finally(function () {
      publishButton.disabled = false;
    });
}

function scheduleSave() {
  setStatus("未保存");
  setPublishStatus("");
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(saveNow, 500);
}

if (publishButton) {
  publishButton.addEventListener("click", publishNow);
}

function updateTodoSummary() {
  var total = todoList.querySelectorAll(".todo-item").length;
  todoSummary.textContent = total + " 件提醒";
}

function setTodoDone(item, isDone) {
  item.classList.toggle("done", isDone);
  item.querySelector(".todo-check").setAttribute("aria-checked", isDone ? "true" : "false");
}

function setActiveTodo(item) {
  Array.prototype.forEach.call(todoList.querySelectorAll(".todo-item"), function (current) {
    current.classList.toggle("active", current === item);
  });
}

function clearActiveTodo() {
  Array.prototype.forEach.call(todoList.querySelectorAll(".todo-item"), function (current) {
    current.classList.remove("active");
  });
}

function sortTodos() {
  var items = Array.prototype.slice.call(todoList.querySelectorAll(".todo-item"));
  items.sort(function (a, b) {
    return Number(a.classList.contains("done")) - Number(b.classList.contains("done"));
  });
  items.forEach(function (item) {
    todoList.appendChild(item);
  });
}

function createTodoItem(todo) {
  var item = document.createElement("li");
  var check = document.createElement("button");
  var content = document.createElement("div");
  var text = document.createElement("p");
  var note = document.createElement("p");
  var actions = document.createElement("div");
  var drag = document.createElement("button");
  var done = document.createElement("button");
  var remove = document.createElement("button");
  var add = document.createElement("button");

  item.className = "todo-item";
  check.className = "todo-check";
  check.type = "button";
  check.setAttribute("aria-label", "标记完成");
  check.setAttribute("aria-checked", todo.done ? "true" : "false");

  text.className = "todo-text";
  text.contentEditable = "true";
  text.spellcheck = false;
  text.textContent = todo.title || "新的提醒事项";

  note.className = "todo-note";
  note.contentEditable = "true";
  note.spellcheck = false;
  note.textContent = todo.note || "在这里填写备注或解释。";

  actions.className = "todo-actions";
  actions.setAttribute("aria-label", "事项操作");

  drag.className = "todo-action todo-drag";
  drag.type = "button";
  drag.draggable = true;
  drag.setAttribute("data-action", "drag");
  drag.setAttribute("aria-label", "拖拽排序");
  drag.textContent = "↕";

  done.className = "todo-action";
  done.type = "button";
  done.setAttribute("data-action", "done");
  done.setAttribute("aria-label", "完成");
  done.textContent = "✓";

  remove.className = "todo-action";
  remove.type = "button";
  remove.setAttribute("data-action", "delete");
  remove.setAttribute("aria-label", "删除");
  remove.textContent = "×";

  add.className = "todo-action";
  add.type = "button";
  add.setAttribute("data-action", "add");
  add.setAttribute("aria-label", "添加");
  add.textContent = "+";

  content.appendChild(text);
  content.appendChild(note);
  actions.appendChild(drag);
  actions.appendChild(done);
  actions.appendChild(remove);
  actions.appendChild(add);
  item.appendChild(check);
  item.appendChild(content);
  item.appendChild(actions);
  setTodoDone(item, Boolean(todo.done));
  return item;
}

function addTodoAfter(item) {
  var newItem = createTodoItem({
    title: "新的提醒事项",
    note: "在这里填写备注或解释。",
    done: false
  });
  item.after(newItem);
  updateTodoSummary();
  setActiveTodo(newItem);
  newItem.querySelector(".todo-text").focus();
  scheduleSave();
}

Array.prototype.forEach.call(todoList.querySelectorAll(".todo-item"), function (item) {
  var checked = item.classList.contains("done") ? "true" : "false";
  item.querySelector(".todo-check").setAttribute("aria-checked", checked);
});

todoList.addEventListener("click", function (event) {
  var item = event.target.closest(".todo-item");
  if (!item) {
    return;
  }

  setActiveTodo(item);

  if (event.target.classList.contains("todo-check")) {
    setTodoDone(item, !item.classList.contains("done"));
    sortTodos();
    scheduleSave();
    return;
  }

  if (!event.target.classList.contains("todo-action")) {
    return;
  }

  if (event.target.getAttribute("data-action") === "done") {
    setTodoDone(item, true);
    sortTodos();
    scheduleSave();
  }

  if (event.target.getAttribute("data-action") === "delete") {
    item.remove();
    clearActiveTodo();
    if (!todoList.querySelector(".todo-item")) {
      todoList.appendChild(createTodoItem({
        title: "新的提醒事项",
        note: "在这里填写备注或解释。",
        done: false
      }));
    }
    updateTodoSummary();
    scheduleSave();
  }

  if (event.target.getAttribute("data-action") === "add") {
    addTodoAfter(item);
  }
});

todoList.addEventListener("input", scheduleSave);

todoList.addEventListener("focusin", function (event) {
  var item = event.target.closest(".todo-item");
  if (item) {
    setActiveTodo(item);
  }
});

document.addEventListener("click", function (event) {
  if (!event.target.closest(".todo-list")) {
    clearActiveTodo();
  }
});

(function () {
  var draggingItem = null;

  todoList.addEventListener("dragstart", function (event) {
    if (!event.target.classList.contains("todo-drag")) {
      event.preventDefault();
      return;
    }

    draggingItem = event.target.closest(".todo-item");
    draggingItem.classList.add("dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", "move");
  });

  todoList.addEventListener("dragover", function (event) {
    var target = event.target.closest(".todo-item");
    if (!draggingItem || !target || target === draggingItem) {
      return;
    }

    event.preventDefault();
    var rect = target.getBoundingClientRect();
    var beforeTarget = event.clientY < rect.top + rect.height / 2;
    todoList.insertBefore(draggingItem, beforeTarget ? target : target.nextSibling);
  });

  todoList.addEventListener("dragend", function () {
    if (!draggingItem) {
      return;
    }

    draggingItem.classList.remove("dragging");
    setActiveTodo(draggingItem);
    draggingItem = null;
    scheduleSave();
  });
})();

function setWhiteboardEditing(isEditing) {
  board.setAttribute("contenteditable", isEditing ? "true" : "false");
  tools.classList.toggle("open", isEditing);
  boardView.classList.toggle("editing", isEditing);
  editToggle.setAttribute("aria-pressed", isEditing ? "true" : "false");

  if (isEditing) {
    board.focus();
  } else {
    scheduleSave();
  }
}

(function () {
  var imageInput = document.getElementById("image-input");
  var formatSelect = document.getElementById("format-select");
  var sizeSelect = document.getElementById("size-select");
  var toolButtons = Array.prototype.slice.call(document.querySelectorAll(".tool-button"));
  var savedRange = null;

  function selectionIsInsideBoard(range) {
    return range && board.contains(range.commonAncestorContainer);
  }

  function saveSelection() {
    var selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return;
    }

    var range = selection.getRangeAt(0);
    if (selectionIsInsideBoard(range)) {
      savedRange = range.cloneRange();
    }
  }

  function saveSelectionSoon() {
    window.setTimeout(saveSelection, 0);
  }

  function nearestEditableBlock(target) {
    if (!target || !board.contains(target)) {
      return null;
    }
    return target.closest("p, h1, h2, h3, li, div");
  }

  function placeCaretAtEnd(element) {
    var range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    var selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    savedRange = range.cloneRange();
  }

  function saveSelectionFromPointer(event) {
    var targetBlock = nearestEditableBlock(event.target);
    window.setTimeout(function () {
      var selection = window.getSelection();
      var range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
      if (targetBlock && (!selectionIsInsideBoard(range) || !targetBlock.contains(range.commonAncestorContainer))) {
        placeCaretAtEnd(targetBlock);
        return;
      }
      saveSelection();
    }, 0);
  }

  function restoreSelection() {
    saveSelection();
    if (!savedRange) {
      board.focus();
      return;
    }

    var selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(savedRange);
  }

  function normalizeWhiteboardMarkup() {
    Array.prototype.forEach.call(board.querySelectorAll("p, h1, h2, h3"), function (block) {
      var list = block.querySelector(":scope > ol, :scope > ul");
      if (list && block.textContent.trim() === list.textContent.trim()) {
        block.replaceWith(list);
      }
    });
  }

  function runCommand(command, value) {
    setWhiteboardEditing(true);
    restoreSelection();
    document.execCommand(command, false, value || null);
    normalizeWhiteboardMarkup();
    saveSelection();
    scheduleSave();
  }

  editToggle.addEventListener("click", function () {
    setWhiteboardEditing(board.getAttribute("contenteditable") !== "true");
  });

  toolButtons.forEach(function (button) {
    button.addEventListener("mousedown", function (event) {
      event.preventDefault();
    });

    button.addEventListener("click", function () {
      runCommand(button.getAttribute("data-command"));
    });
  });

  formatSelect.addEventListener("change", function () {
    runCommand("formatBlock", formatSelect.value);
  });

  sizeSelect.addEventListener("change", function () {
    runCommand("fontSize", sizeSelect.value);
  });

  document.addEventListener("selectionchange", saveSelection);
  board.addEventListener("click", saveSelectionFromPointer);
  board.addEventListener("mousedown", saveSelectionSoon);
  board.addEventListener("touchend", saveSelectionFromPointer);
  board.addEventListener("keyup", saveSelection);
  board.addEventListener("mouseup", saveSelectionFromPointer);
  board.addEventListener("focus", saveSelection);
  board.addEventListener("input", scheduleSave);

  imageInput.addEventListener("change", function () {
    var file = imageInput.files && imageInput.files[0];
    if (!file) {
      return;
    }

    var reader = new FileReader();
    reader.onload = function () {
      setStatus("上传中");
      fetch("/api/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: file.name,
          dataUrl: reader.result
        })
      })
        .then(function (response) {
          if (!response.ok) {
            throw new Error("Upload failed");
          }
          return response.json();
        })
        .then(function (result) {
          runCommand("insertImage", result.url);
          imageInput.value = "";
        })
        .catch(function () {
          setStatus("上传失败");
        });
    };
    reader.readAsDataURL(file);
  });
})();

sortTodos();
updateTodoSummary();
