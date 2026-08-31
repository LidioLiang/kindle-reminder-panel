"use client";

import { useEffect, useMemo, useState } from "react";

function sortTodos(todos) {
  return [...todos].sort((a, b) => Number(a.done) - Number(b.done));
}

function getDateParts() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
  let lunar = "农历";

  try {
    const text = new Intl.DateTimeFormat("zh-CN-u-ca-chinese", {
      month: "long",
      day: "numeric"
    }).format(now);
    const parts = text.match(/^(.+?)(\d+)日$/);
    const names = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
    const chineseDay = (number) => {
      if (number <= 10) return "初" + names[number];
      if (number < 20) return "十" + names[number - 10];
      if (number === 20) return "二十";
      if (number < 30) return "廿" + names[number - 20];
      return number === 30 ? "三十" : String(number);
    };
    lunar = parts ? "农历" + parts[1] + chineseDay(Number(parts[2])) : "农历" + text;
  } catch {
    lunar = "农历";
  }

  return {
    date: `${month}月${day}日`,
    week: `${weekdays[now.getDay()]} · ${lunar}`
  };
}

export default function DisplayPanel({ initialData }) {
  const [data, setData] = useState(initialData);
  const [activeView, setActiveView] = useState("board-view");
  const [chromeHidden, setChromeHidden] = useState(true);
  const dateParts = useMemo(getDateParts, []);

  useEffect(() => {
    fetch("/api/panel", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : initialData)
      .then(setData)
      .catch(() => {});
  }, [initialData]);

  const title = activeView === "board-view" ? "自由白板" : "今日重要事项";

  return (
    <div className={`display-mode ${chromeHidden ? "chrome-hidden" : ""}`} onClick={() => setChromeHidden(!chromeHidden)}>
      <div className="page">
        <header className="masthead">
          <div>
            <p className="eyebrow">Kindle Reminder Board</p>
            <div className="title-row">
              <h1 id="page-title">{title}</h1>
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
            <ul className="todo-list" data-panel="todos">
              {sortTodos(data.todos).map((todo, index) => (
                <li className={`todo-item ${todo.done ? "done" : ""}`} key={`${todo.title}-${index}`}>
                  <button className="todo-check" type="button" aria-label="完成状态" aria-checked={todo.done ? "true" : "false"} disabled />
                  <div>
                    <p className="todo-text">{todo.title}</p>
                    <p className="todo-note">{todo.note}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className={`view board-panel ${activeView === "board-view" ? "active" : ""}`} id="board-view">
            <div className="board-shell">
              <div className="whiteboard" dangerouslySetInnerHTML={{ __html: data.whiteboardHtml }} />
            </div>
          </section>
        </main>

        <nav className="tabbar" aria-label="面板切换" onClick={(event) => event.stopPropagation()}>
          <button className={`tab-button ${activeView === "board-view" ? "active" : ""}`} type="button" onClick={() => { setActiveView("board-view"); setChromeHidden(false); }}>自由白板</button>
          <button className={`tab-button ${activeView === "todo-view" ? "active" : ""}`} type="button" onClick={() => { setActiveView("todo-view"); setChromeHidden(false); }}>重要事项</button>
        </nav>
      </div>
    </div>
  );
}
