/**
 * Bridge between the native shell and the hosted web portal.
 *
 * The portal is the same site students use in a browser, so every change the
 * web team ships (new screens, the mobile-number + OTP login, the student
 * switcher...) reaches the app without a store update. This script, injected
 * before the portal's own code runs, only adds what a phone needs:
 *
 *   - tells the shell which route is showing (to highlight the native tab bar)
 *   - tells the shell when someone signs in / out (push registration, Face ID lock)
 *   - turns blob / data / <a download> downloads into native files (open / share)
 *   - sends links to other sites to the system browser
 *   - lets the shell navigate the portal without reloading it
 *   - hides the portal's own mobile bottom bar (the native tab bar replaces it)
 *   - closes the side menu after a page is picked, plus small phone styling
 *
 * It never changes what the portal does in a normal browser.
 */

export type BridgeMessage =
  | { type: 'route'; path: string; title?: string }
  | { type: 'session'; token: string | null; institute?: string | null; name?: string | null; role?: string | null }
  | { type: 'download'; name: string; mime: string; base64: string }
  | { type: 'downloadUrl'; url: string; name: string; token?: string | null }
  | { type: 'external'; url: string }
  | { type: 'error'; message: string };

export function parseBridgeMessage(raw: string): BridgeMessage | null {
  try {
    const msg = JSON.parse(raw);
    return msg && typeof msg.type === 'string' ? (msg as BridgeMessage) : null;
  } catch {
    return null;
  }
}

/** JS to run in the page to move the portal to `path` without a reload. */
export function navigateScript(path: string): string {
  return `window.__edureoneNavigate && window.__edureoneNavigate(${JSON.stringify(path)}); true;`;
}

/** Clears the portal's client session (same keys as the portal's own logout). */
export const SIGN_OUT_SCRIPT = `(function(){
  var L=["user","edureone.auth.user","access_token","refresh_token","session_uuid","active_institute_uuid","auth-storage","institute-storage","edureone.parent.opened-child"];
  var S=["edureone.superadmin.global.session","edureone.student-selection"];
  L.forEach(function(k){try{localStorage.removeItem(k)}catch(e){}});
  S.forEach(function(k){try{sessionStorage.removeItem(k)}catch(e){}});
  location.replace("/login/student");
})(); true;`;

/**
 * Only runs on the portal itself: payment gateway pages and other sites the
 * portal redirects to are left untouched.
 */
export const injectedBeforeLoad = (portalOrigin: string) => `(function () {
  if (window.__edureoneShell) return;
  if (${JSON.stringify(portalOrigin)} && location.origin !== ${JSON.stringify(portalOrigin)}) return;
  window.__edureoneShell = { version: 1 };
  var post = function (msg) {
    try { window.ReactNativeWebView.postMessage(JSON.stringify(msg)); } catch (e) {}
  };

  /* ---- look: the native tab bar replaces the portal's mobile bottom bar ---- */
  // The app already keeps the portal below the status bar, so the portal's own
  // safe-area padding would add a second, empty strip at the top. Pages also
  // leave room at the bottom for the floating tab bar (--edureone-tabbar).
  var css = ".app-bottom-nav{display:none!important}" +
    "html.in-edureone-app .app-topbar{padding-top:0!important;height:3.5rem!important}" +
    "html.in-edureone-app .app-mobile-sidebar{padding-top:0!important;padding-bottom:0!important}" +
    "html.in-edureone-app main{padding-bottom:calc(var(--edureone-tabbar,0px) + 12px)!important}" +
    "html.in-edureone-app body{-webkit-tap-highlight-color:transparent;overscroll-behavior-y:none}" +
    // Student & parent app: the staff "User login" link stays on the website only.
    "html.in-edureone-app a[href='/login']{display:none!important}" +
    // Academic year picker: a clean pill without the dropdown arrow.
    "html.in-edureone-app .app-topbar button[role=combobox]>svg:last-child{display:none!important}" +
    // Stat cards: text takes the free space, the icon stays a fixed square at
    // the top right, and long amounts wrap instead of pushing the icon down.
    "html.in-edureone-app .rounded-xl .flex.justify-between>div:first-child:not(:only-child){min-width:0;flex:1 1 auto}" +
    "html.in-edureone-app .rounded-xl .flex.justify-between:has(>div.rounded-lg.justify-center:last-child){flex-wrap:nowrap!important}" +
    "html.in-edureone-app .rounded-xl>.p-5:has(>.flex.justify-between>div.rounded-lg.justify-center:last-child){padding:1rem!important}" +
    "html.in-edureone-app .rounded-xl .flex.justify-between>div.rounded-lg.justify-center:last-child{flex:0 0 auto;align-self:flex-start;margin-left:.625rem}" +
    "html.in-edureone-app .rounded-xl .flex.justify-between>div:first-child .text-2xl{font-size:1.375rem;line-height:1.2;overflow-wrap:anywhere}" +
    // Soft translucent ("glass") surfaces over a gentle tinted background.
    "html.in-edureone-app body{background:radial-gradient(120% 60% at 0% 0%,oklch(0.95 0.035 250) 0%,transparent 60%)," +
      "radial-gradient(90% 50% at 100% 30%,oklch(0.96 0.03 200) 0%,transparent 60%),var(--background);background-attachment:fixed}" +
    "html.in-edureone-app .min-h-screen.bg-background,html.in-edureone-app .min-h-svh.bg-background{background:transparent!important}" +
    "html.in-edureone-app .app-topbar{background:color-mix(in oklch,var(--background) 62%,transparent)!important;" +
      "-webkit-backdrop-filter:blur(20px) saturate(180%);backdrop-filter:blur(20px) saturate(180%);border-bottom-color:rgba(28,37,64,.06)!important}" +
    "html.in-edureone-app main .rounded-xl.border{background:color-mix(in oklch,var(--card) 72%,transparent)!important;" +
      "-webkit-backdrop-filter:blur(16px) saturate(170%);backdrop-filter:blur(16px) saturate(170%);" +
      "border-color:rgba(255,255,255,.7)!important;border-radius:1.1rem!important;box-shadow:0 1px 2px rgba(28,37,64,.04),0 8px 24px -12px rgba(28,37,64,.14)!important}" +
    "html.in-edureone-app main .rounded-xl.border .rounded-xl.border{background:color-mix(in oklch,var(--card) 55%,transparent)!important;box-shadow:none!important;-webkit-backdrop-filter:none;backdrop-filter:none}" +
    "html.in-edureone-app .dark main .rounded-xl.border,html.dark.in-edureone-app main .rounded-xl.border{border-color:rgba(255,255,255,.08)!important}";
  var addStyle = function () {
    if (!document.head || document.getElementById("edureone-shell-css")) return;
    var s = document.createElement("style");
    s.id = "edureone-shell-css";
    s.textContent = css;
    document.head.appendChild(s);
    document.documentElement.classList.add("in-edureone-app");
  };
  addStyle();
  document.addEventListener("DOMContentLoaded", addStyle);

  /* ---- side menu: close it once a page is picked ---- */
  // The portal's phone menu stays open after a link is tapped. Its own (hidden)
  // close button shuts it the same way the X would.
  var closeMenu = function () {
    var menu = document.querySelector(".app-mobile-sidebar[data-state=open]");
    if (!menu) return;
    var btn = menu.querySelector(":scope > button");
    if (btn) { btn.click(); return; }
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  };
  document.addEventListener("click", function (ev) {
    var a = ev.target && ev.target.closest && ev.target.closest(".app-mobile-sidebar a[href]");
    if (a && a.pathname === location.pathname) setTimeout(closeMenu, 0);
  });

  /* ---- route changes ---- */
  var lastPath = null;
  var reportRoute = function () {
    var p = location.pathname || "/";
    // Staff login is not part of the student app.
    if (p === "/login") { location.replace("/login/student"); return; }
    if (p === lastPath) return;
    lastPath = p;
    closeMenu();
    post({ type: "route", path: p, title: document.title });
  };
  ["pushState", "replaceState"].forEach(function (fn) {
    var orig = history[fn];
    history[fn] = function () {
      var r = orig.apply(this, arguments);
      setTimeout(reportRoute, 0);
      return r;
    };
  });
  window.addEventListener("popstate", function () { setTimeout(reportRoute, 0); });
  window.addEventListener("load", reportRoute);

  /* Native tab taps: client-side navigation, no reload (React Router listens to popstate). */
  window.__edureoneNavigate = function (path) {
    if (!path || location.pathname === path) return;
    var idx = (history.state && typeof history.state.idx === "number") ? history.state.idx + 1 : 0;
    history.pushState({ usr: null, key: Math.random().toString(36).slice(2, 10), idx: idx }, "", path);
    window.dispatchEvent(new PopStateEvent("popstate", { state: history.state }));
  };

  /* ---- sign in / sign out ---- */
  var lastSession = "";
  var reportSession = function () {
    var token = null, institute = null, name = null, role = null;
    try {
      token = localStorage.getItem("access_token");
      institute = localStorage.getItem("active_institute_uuid");
      var u = JSON.parse(localStorage.getItem("user") || "null");
      if (u) { name = u.full_name || u.name || null; role = u.role_code || u.role || null; }
    } catch (e) {}
    var key = (token || "") + "|" + (institute || "");
    if (key === lastSession) return;
    lastSession = key;
    post({ type: "session", token: token, institute: institute, name: name, role: role });
  };
  setInterval(function () { reportSession(); reportRoute(); }, 1500);
  window.addEventListener("load", reportSession);

  /* ---- downloads ---- */
  var blobs = {};
  var origCreate = URL.createObjectURL.bind(URL);
  var origRevoke = URL.revokeObjectURL.bind(URL);
  URL.createObjectURL = function (obj) {
    var url = origCreate(obj);
    if (obj instanceof Blob) blobs[url] = obj;
    return url;
  };
  URL.revokeObjectURL = function (url) {
    setTimeout(function () { delete blobs[url]; }, 60000);
    return origRevoke(url);
  };
  var isLocal = function (href) { return /^(blob:|data:)/i.test(href || ""); };
  var extFor = function (mime) {
    if (!mime) return "";
    if (mime.indexOf("pdf") >= 0) return ".pdf";
    if (mime.indexOf("sheet") >= 0 || mime.indexOf("excel") >= 0) return ".xlsx";
    if (mime.indexOf("csv") >= 0) return ".csv";
    if (mime.indexOf("image/") === 0) return "." + mime.split("/")[1];
    return "";
  };
  var nameFor = function (href, mime, given) {
    if (given) return given;
    try {
      var last = decodeURIComponent(new URL(href, location.href).pathname.split("/").pop() || "");
      if (/\\.[a-z0-9]{2,5}$/i.test(last)) return last;
    } catch (e) {}
    return "edureone-" + Date.now() + extFor(mime);
  };
  var sendBlob = function (href, given) {
    var p = blobs[href] ? Promise.resolve(blobs[href]) : fetch(href).then(function (r) { return r.blob(); });
    p.then(function (blob) {
      var reader = new FileReader();
      reader.onload = function () {
        post({ type: "download", name: nameFor(href, blob.type, given), mime: blob.type || "application/octet-stream",
               base64: String(reader.result).split(",")[1] || "" });
      };
      reader.readAsDataURL(blob);
    }).catch(function (e) { post({ type: "error", message: "download failed: " + e }); });
  };
  var sameOrigin = function (href) {
    try { return new URL(href, location.href).origin === location.origin; } catch (e) { return false; }
  };
  var handleAnchor = function (a) {
    var href = a.href;
    if (!href) return false;
    if (isLocal(href)) { sendBlob(href, a.getAttribute("download")); return true; }
    if (a.hasAttribute("download") && /^https?:/i.test(href)) {
      var token = null;
      try { token = localStorage.getItem("access_token"); } catch (e) {}
      post({ type: "downloadUrl", url: href, name: nameFor(href, "", a.getAttribute("download")), token: token });
      return true;
    }
    if (/^https?:/i.test(href) && !sameOrigin(href)) { post({ type: "external", url: href }); return true; }
    return false;
  };
  var origClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (handleAnchor(this)) return;
    return origClick.call(this);
  };
  document.addEventListener("click", function (ev) {
    var a = ev.target && ev.target.closest && ev.target.closest("a[href]");
    if (a && handleAnchor(a)) { ev.preventDefault(); ev.stopPropagation(); }
  }, true);
  var origOpen = window.open.bind(window);
  window.open = function (url, target, features) {
    var href = typeof url === "string" ? url : (url && url.toString ? url.toString() : "");
    if (isLocal(href)) { sendBlob(href, null); return null; }
    if (/^https?:/i.test(href) && !sameOrigin(href)) { post({ type: "external", url: href }); return null; }
    return origOpen(url, target === "_blank" ? "_self" : target, features);
  };
})(); true;`;
