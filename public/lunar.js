(function () {
  var week = document.getElementById("today-week");
  var date = document.getElementById("today-date");
  if (!week) {
    return;
  }

  var now = new Date();
  var month = String(now.getMonth() + 1).padStart(2, "0");
  var day = String(now.getDate()).padStart(2, "0");
  var weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
  var lunar = "农历";

  if (date && !date.textContent.trim()) {
    date.textContent = month + "月" + day + "日";
  }

  function chineseDay(number) {
    var names = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
    if (number <= 10) return "初" + names[number];
    if (number < 20) return "十" + names[number - 10];
    if (number === 20) return "二十";
    if (number < 30) return "廿" + names[number - 20];
    return number === 30 ? "三十" : String(number);
  }

  try {
    var text = new Intl.DateTimeFormat("zh-CN-u-ca-chinese", {
      month: "long",
      day: "numeric"
    }).format(now);
    var parts = text.match(/^(.+?)(\d+)日$/);
    lunar = parts ? "农历" + parts[1] + chineseDay(Number(parts[2])) : "农历" + text;
  } catch (error) {
    var fallback = document.getElementById("lunar-date");
    lunar = fallback ? fallback.textContent : lunar;
  }

  week.textContent = weekdays[now.getDay()] + " · " + lunar;
})();
