// enhance.js — بدون هیچ فریم‌ورکی (نه React، نه هیچ باندل سنگینی).
// فقط دو کار می‌کند: (۱) ثبت کلیک روی لینک‌های داخل کارت، (۲) جابه‌جایی
// حالت روشن/تاریک بین دو نسخه‌ی از پیش رندرشده (بدون رندر مجدد در مرورگر).
(function () {
  "use strict";

  var username = location.pathname.replace(/^\/+/, "").split("/")[0];
  var themeKey = "card-theme-" + username;

  function trackClick() {
    try {
      navigator.sendBeacon
        ? navigator.sendBeacon("/api/click/" + username)
        : fetch("/api/click/" + username, { method: "POST", keepalive: true });
    } catch (e) {
      /* silent — ثبت آمار نباید تجربه کاربر را مختل کند */
    }
  }

  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-track-type]");
    if (el) {
      var url = el.getAttribute("data-track-url");
      trackClick();
      if (url) {
        e.preventDefault();
        window.open(url, "_blank");
      }
      return;
    }

    var toggle = e.target.closest("[data-dark-toggle]");
    if (toggle) {
      var light = document.getElementById("card-light");
      var dark = document.getElementById("card-dark");
      if (!light || !dark) return;
      var showingDark = dark.style.display !== "none";
      dark.style.display = showingDark ? "none" : "";
      light.style.display = showingDark ? "" : "none";
      try {
        localStorage.setItem(themeKey, showingDark ? "light" : "dark");
      } catch (err) {}
    }
  });

  // اگر همین کاربر (کارت) قبلاً در همین مرورگر حالت تاریک را دستی انتخاب
  // کرده بود، همان را نگه دار — این کلید مخصوص همین یوزرنیم است، پس روی
  // تمِ پیش‌فرض (سرورساید، بر اساس تنظیمات واقعی کارت) کارت‌های دیگر اثر نمی‌گذارد.
  try {
    var savedTheme = localStorage.getItem(themeKey);
    if (savedTheme === "dark" || savedTheme === "light") {
      var l = document.getElementById("card-light");
      var d = document.getElementById("card-dark");
      if (l && d) {
        l.style.display = savedTheme === "dark" ? "none" : "";
        d.style.display = savedTheme === "dark" ? "" : "none";
      }
    }
  } catch (e) {}
})();
