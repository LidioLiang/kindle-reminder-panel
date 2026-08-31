"use client";

import { useEffect, useRef, useState } from "react";

function sortTodos(todos) {
  return [...todos].sort((a, b) => Number(a.done) - Number(b.done));
}

function newTodo() {
  return {
    title: "新的提醒事项",
    note: "在这里填写备注或解释。",
    done: false
  };
}

function getDateParts() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
  return {
    date: `${month}月${day}日`,
    week: weekdays[now.getDay()]
  };
}

export default function AdminPanel({ initialData }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [loginStatus, setLoginStatus] = useState("");
  const [data, setData] = useState(initialData);
  const [activeView, setActiveView] = useState("board-view");
  const [activeTodo, setActiveTodo] = useState(null);
  const [saveStatus, setSaveStatus] = useState("已保存");
  const [boardEditing, setBoardEditing] = useState(false);
  const saveTimer = useRef(null);
  const boardRef = useRef(null);
  const savedRange = useRef(null);
  const draggingIndex = useRef(null);
  const dateParts = getDateParts();

  useEffect(() => {
    fetch("/api/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((result) => setAuthenticated(Boolean(result.authenticated)))
      .catch(() => setAuthenticated(false));
  }, []);

  useEffect(() => {
    return () => window.clearTimeout(saveTimer.current);
  }, []);

  function collectData(nextData = data) {
    return {
      todos: nextData.todos,
      whiteboardHtml: boardRef.current ? boardRef.current.innerHTML : nextData.whiteboardHtml
    };
  }

  function saveNow(nextData = data) {
    window.clearTimeout(saveTimer.current);
    setSaveStatus("保存中");
    return fetch("/api/panel", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(collectData(nextData))
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Save failed");
        }
        return response.json();
      })
      .then((saved) => {
        setData(saved);
        setSaveStatus("已保存");
      })
      .catch(() => {
        setSaveStatus("保存失败");
      });
  }

  function scheduleSave(nextData = data) {
    setSaveStatus("未保存");
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => saveNow(nextData), 500);
  }

  function updateTodo(index, patch) {
    const todos = data.todos.map((todo, currentIndex) => currentIndex === index ? { ...todo, ...patch } : todo);
    const nextData = { ...data, todos };
    setData(nextData);
    scheduleSave(nextData);
  }

  function completeTodo(index) {
    const todos = sortTodos(data.todos.map((todo, currentIndex) => currentIndex === index ? { ...todo, done: true } : todo));
    const nextData = { ...data, todos };
    setData(nextData);
    setActiveTodo(null);
    scheduleSave(nextData);
  }

  function toggleTodo(index) {
    const todos = sortTodos(data.todos.map((todo, currentIndex) => currentIndex === index ? { ...todo, done: !todo.done } : todo));
    const nextData = { ...data, todos };
    setData(nextData);
    scheduleSave(nextData);
  }

  function deleteTodo(index) {
    const todos = data.todos.filter((_, currentIndex) => currentIndex !== index);
    const nextData = { ...data, todos: todos.length > 0 ? todos : [newTodo()] };
    setData(nextData);
    setActiveTodo(null);
    scheduleSave(nextData);
  }

  function addTodoAfter(index) {
    const todos = [...data.todos];
    todos.splice(index + 1, 0, newTodo());
    const nextData = { ...data, todos };
    setData(nextData);
    setActiveTodo(index + 1);
    scheduleSave(nextData);
  }

  function moveTodo(fromIndex, toIndex) {
    if (fromIndex === toIndex || fromIndex == null) {
      return;
    }
    const todos = [...data.todos];
    const [item] = todos.splice(fromIndex, 1);
    todos.splice(toIndex, 0, item);
    const nextData = { ...data, todos };
    setData(nextData);
    setActiveTodo(toIndex);
    scheduleSave(nextData);
  }

  function saveSelection() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !boardRef.current) {
      return;
    }
    const range = selection.getRangeAt(0);
    if (boardRef.current.contains(range.commonAncestorContainer)) {
      savedRange.current = range.cloneRange();
    }
  }

  function restoreSelection() {
    if (!savedRange.current) {
      boardRef.current?.focus();
      return;
    }
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(savedRange.current);
  }

  function setWhiteboardEditing(isEditing) {
    setBoardEditing(isEditing);
    if (isEditing) {
      window.setTimeout(() => boardRef.current?.focus(), 0);
    } else {
      scheduleSave();
    }
  }

  function runCommand(command, value = null) {
    setWhiteboardEditing(true);
    window.setTimeout(() => {
      restoreSelection();
      document.execCommand(command, false, value);
      saveSelection();
      scheduleSave();
    }, 0);
  }

  function uploadImage(file) {
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSaveStatus("上传中");
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
        .then((response) => {
          if (!response.ok) {
            throw new Error("Upload failed");
          }
          return response.json();
        })
        .then((result) => runCommand("insertImage", result.url))
        .catch(() => setSaveStatus("上传失败"));
    };
    reader.readAsDataURL(file);
  }

  function login(event) {
    event.preventDefault();
    setLoginStatus("正在登录");
    fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ password })
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Login failed");
        }
        setAuthenticated(true);
        setLoginStatus("");
      })
      .catch(() => setLoginStatus("密码不正确"));
  }

  if (!authenticated) {
    return (
      <div className="admin-mode">
        <main className="login-panel">
          <form className="login-card" onSubmit={login}>
            <h1>电脑编辑</h1>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="输入后台密码" aria-label="后台密码" />
            <button type="submit">进入编辑页</button>
            <p>{loginStatus || "Kindle 展示页保持公开，编辑页需要密码。"}</p>
          </form>
        </main>
      </div>
    );
  }

  return (
    <div className="admin-mode" onClick={(event) => {
      if (!event.target.closest(".todo-list")) {
        setActiveTodo(null);
      }
    }}>
      <div className="page">
        <header className="masthead">
          <div>
            <p className="eyebrow">Kindle Reminder Board</p>
            <div className="title-row">
              <h1 id="page-title">{activeView === "board-view" ? "自由白板" : "今日重要事项"}</h1>
              <button className={`edit-toggle ${activeView === "board-view" ? "visible" : ""}`} type="button" aria-label="编辑白板" aria-pressed={boardEditing} onClick={() => setWhiteboardEditing(!boardEditing)}>⚙</button>
              <span className="save-status">{saveStatus}</span>
            </div>
          </div>
          <div className="date-card" aria-label="今天日期">
            <strong>{dateParts.date}</strong>
            <span>{dateParts.week}</span>
          </div>
        </header>

        <main className="views">
          <section className={`view todo-panel ${activeView === "todo-view" ? "active" : ""}`} id="todo-view">
            <div className="todo-summary">{data.todos.length} 件提醒</div>
            <ul className="todo-list" data-panel="todos" onClick={(event) => event.stopPropagation()}>
              {data.todos.map((todo, index) => (
                <li
                  className={`todo-item ${todo.done ? "done" : ""} ${activeTodo === index ? "active" : ""}`}
                  key={index}
                  onClick={() => setActiveTodo(index)}
                  onDragOver={(event) => {
                    event.preventDefault();
                    moveTodo(draggingIndex.current, index);
                    draggingIndex.current = index;
                  }}
                >
                  <button className="todo-check" type="button" aria-label="标记完成" aria-checked={todo.done ? "true" : "false"} onClick={() => toggleTodo(index)} />
                  <div>
                    <p className="todo-text" contentEditable suppressContentEditableWarning spellCheck={false} onInput={(event) => updateTodo(index, { title: event.currentTarget.textContent })}>{todo.title}</p>
                    <p className="todo-note" contentEditable suppressContentEditableWarning spellCheck={false} onInput={(event) => updateTodo(index, { note: event.currentTarget.textContent })}>{todo.note}</p>
                  </div>
                  <div className="todo-actions" aria-label="事项操作">
                    <button className="todo-action todo-drag" type="button" draggable onDragStart={() => { draggingIndex.current = index; }} onDragEnd={() => { draggingIndex.current = null; }} aria-label="拖拽排序">↕</button>
                    <button className="todo-action" type="button" aria-label="完成" onClick={() => completeTodo(index)}>✓</button>
                    <button className="todo-action" type="button" aria-label="删除" onClick={() => deleteTodo(index)}>×</button>
                    <button className="todo-action" type="button" aria-label="添加" onClick={() => addTodoAfter(index)}>+</button>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className={`view board-panel ${activeView === "board-view" ? "active" : ""}`} id="board-view">
            <div className={`tools ${boardEditing ? "open" : ""}`} aria-label="白板编辑工具" onMouseDown={(event) => {
              if (event.target.closest("button")) {
                event.preventDefault();
              }
            }}>
              <select className="tool-select" aria-label="段落格式" defaultValue="p" onChange={(event) => runCommand("formatBlock", event.target.value)}>
                <option value="p">正文</option>
                <option value="h1">大标题</option>
                <option value="h2">小标题</option>
                <option value="h3">重点</option>
              </select>
              <select className="tool-select" aria-label="字体大小" defaultValue="4" onChange={(event) => runCommand("fontSize", event.target.value)}>
                <option value="3">小字</option>
                <option value="4">正常</option>
                <option value="5">大字</option>
                <option value="7">特大</option>
              </select>
              <div className="tool-group" aria-label="文字样式">
                <button className="tool-button" type="button" onClick={() => runCommand("bold")}>加粗</button>
                <button className="tool-button" type="button" onClick={() => runCommand("italic")}>斜体</button>
                <button className="tool-button" type="button" onClick={() => runCommand("underline")}>下划线</button>
              </div>
              <div className="tool-group" aria-label="对齐方式">
                <button className="tool-button" type="button" onClick={() => runCommand("justifyLeft")}>左对齐</button>
                <button className="tool-button" type="button" onClick={() => runCommand("justifyCenter")}>居中</button>
                <button className="tool-button" type="button" onClick={() => runCommand("justifyRight")}>右对齐</button>
              </div>
              <div className="tool-group" aria-label="列表">
                <button className="tool-button" type="button" onClick={() => runCommand("insertUnorderedList")}>无序列表</button>
                <button className="tool-button" type="button" onClick={() => runCommand("insertOrderedList")}>编号列表</button>
              </div>
              <button className="tool-button" type="button" onClick={() => runCommand("removeFormat")}>清除格式</button>
              <label className="image-button">
                插入图片
                <input type="file" accept="image/*" onChange={(event) => uploadImage(event.target.files?.[0])} />
              </label>
            </div>
            <div className="board-shell">
              <div
                className="whiteboard"
                ref={boardRef}
                contentEditable={boardEditing}
                suppressContentEditableWarning
                spellCheck={false}
                aria-label="自由白板"
                onInput={() => scheduleSave()}
                onKeyUp={saveSelection}
                onMouseUp={saveSelection}
                onClick={saveSelection}
                dangerouslySetInnerHTML={{ __html: data.whiteboardHtml }}
              />
            </div>
          </section>
        </main>

        <nav className="tabbar" aria-label="面板切换">
          <button className={`tab-button ${activeView === "board-view" ? "active" : ""}`} type="button" onClick={() => setActiveView("board-view")}>自由白板</button>
          <button className={`tab-button ${activeView === "todo-view" ? "active" : ""}`} type="button" onClick={() => { setActiveView("todo-view"); setWhiteboardEditing(false); }}>重要事项</button>
        </nav>
      </div>
    </div>
  );
}
