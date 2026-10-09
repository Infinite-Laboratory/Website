/*!
 * Infinite Laboratory: pixel bubbles background
 * Transparent, decorative, CSS-animated. No dependencies, no per-frame JavaScript.
 *
 * Usage:
 *   <div class="hero" style="position:relative">
 *     <div data-bubbles></div>           <!-- fills the nearest positioned parent -->
 *     ...your content (give it position:relative; z-index:1)...
 *   </div>
 *   Load this file with a script tag (src="/bubbles.js", defer)
 *
 * Options (attributes on the element):
 *   data-bubbles-count="18"    how many bubbles share the 10 s loop
 *   data-bubbles-seed="20261008"  change for a different layout
 *   data-bubbles-clear="none"  skip the hero keep-out zones (text column, nav strip, info block); for banners and other full-bleed uses
 *   CSS vars --lbub-fade-top / --lbub-fade-from / --lbub-fade-to  top fade-in end, bottom fade start and end (default 16% / 48% / 94%)
 */
(function () {
  "use strict";
  var W = 1920, H = 1080, LOOP = 10;
  var KIND = [
    { r: 10, px: 8, w: 1.7, rise: 170, p: 0.14 },
    { r: 8,  px: 8, w: 1.6, rise: 150, p: 0.18 },
    { r: 6,  px: 6, w: 1.4, rise: 130, p: 0.22 },
    { r: 5,  px: 4, w: 1.1, rise: 100, p: 0.46 }
  ];
  var COL = ["#19b4ff", "#1fd0ee", "#26dff0", "#1596ff", "#33d5ee", "#2ab0ff", "#26d9e6"];

  var CSS =
    ".lbub-root{position:absolute;inset:0;overflow:hidden;pointer-events:none;contain:strict;-webkit-mask-image:linear-gradient(180deg,rgba(0,0,0,0) 0,#000 var(--lbub-fade-top,16%),#000 var(--lbub-fade-from,48%),rgba(0,0,0,0) var(--lbub-fade-to,94%));mask-image:linear-gradient(180deg,rgba(0,0,0,0) 0,#000 var(--lbub-fade-top,16%),#000 var(--lbub-fade-from,48%),rgba(0,0,0,0) var(--lbub-fade-to,94%))}" +
    ".lbub-stage{position:absolute;left:50%;top:50%;width:" + W + "px;height:" + H + "px;transform-origin:0 0}" +
    ".lbub-w{position:absolute;width:0;height:0;will-change:transform;animation:lbub-wob " + LOOP + "s linear infinite;animation-delay:var(--d)}" +
    "@keyframes lbub-wob{0%{transform:translate3d(0,0,0)}9%{transform:translate3d(14px,calc(var(--rise)*-.25),0)}18%{transform:translate3d(-10px,calc(var(--rise)*-.5),0)}26%{transform:translate3d(12px,calc(var(--rise)*-.75),0)}35%,100%{transform:translate3d(0,calc(var(--rise)*-1),0)}}" +
    ".lbub-b{position:absolute;display:block;opacity:0;will-change:transform,opacity;animation:lbub-pop " + LOOP + "s linear infinite;animation-delay:var(--d)}" +
    "@keyframes lbub-pop{0%{opacity:0;transform:scale(.85)}3.5%{opacity:.95;transform:scale(1)}30%{opacity:.95;transform:scale(1.04)}31.5%{opacity:1;transform:scale(1.16);filter:brightness(1.8)}34%{opacity:0;transform:scale(1.34);filter:brightness(2)}100%{opacity:0;transform:scale(1.34)}}" +
    ".lbub-s{position:absolute;opacity:0;animation:lbub-burst " + LOOP + "s linear infinite;animation-delay:var(--d)}" +
    "@keyframes lbub-burst{0%,30.5%{opacity:0;transform:translate3d(0,0,0) scale(1)}31.5%{opacity:1;transform:translate3d(0,0,0) scale(1)}37%{opacity:0;transform:translate3d(var(--dx),var(--dy),0) scale(.5)}100%{opacity:0}}" +
    ".lbub-root.lbub-off *{animation-play-state:paused!important}" +
    "@media (prefers-reduced-motion:reduce){.lbub-root{display:none}}";

  function rng(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function build(host) {
    var count = parseInt(host.getAttribute("data-bubbles-count"), 10) || 18;
    var seed = parseInt(host.getAttribute("data-bubbles-seed"), 10) || 20261008;
    var free = host.getAttribute("data-bubbles-clear") === "none";
    var rnd = rng(seed);
    host.classList.add("lbub-root");
    host.setAttribute("aria-hidden", "true");
    var stage = document.createElement("div");
    stage.className = "lbub-stage";
    host.appendChild(stage);

    function pick() { var u = rnd(), a = 0; for (var i = 0; i < KIND.length; i++) { a += KIND[i].p; if (u <= a) return KIND[i]; } return KIND[3]; }

    // scattered positions, spaced apart, keeping the left text column clear for copy
    var pts = [], guard = 0;
    while (pts.length < count && guard++ < 4000) {
      var x = 120 + rnd() * 1680, y = 140 + rnd() * 820, ok = true;
      if (!free) {
        if (x < 840 && y > 360) continue;   // keep the left text column clear
        if (y < 190) continue;               // keep the nav strip clear
        if (x > 1340 && y > 600) continue;   // keep the bottom-right info block clear
      }
      for (var i = 0; i < pts.length; i++) if (Math.hypot(pts[i][0] - x, pts[i][1] - y) < 190) { ok = false; break; }
      if (ok) pts.push([x, y]);
    }
    var order = pts.map(function (_, i) { return i; });
    for (var i2 = order.length - 1; i2 > 0; i2--) { var j = Math.floor(rnd() * (i2 + 1)), t = order[i2]; order[i2] = order[j]; order[j] = t; }

    pts.forEach(function (p, idx) {
      var g = pick(), col = COL[Math.floor(rnd() * COL.length)];
      var start = ((order[idx] + rnd() * 0.8) / pts.length) * LOOP, D = "-" + start.toFixed(2) + "s";
      var R = g.r, hw = g.w / 2, rr = Math.ceil(R + hw + 1), pad = 30, size = (rr * 2 + 1) * g.px + pad * 2, o0 = pad + rr * g.px;

      var w = document.createElement("div");
      w.className = "lbub-w"; w.style.left = p[0] + "px"; w.style.top = (p[1] + g.rise / 2) + "px";
      w.style.setProperty("--d", D); w.style.setProperty("--rise", g.rise + "px");

      var b = document.createElement("canvas");
      b.width = size; b.height = size; b.className = "lbub-b";
      var c = b.getContext("2d");
      c.fillStyle = col; c.shadowColor = col; c.shadowBlur = 22;
      for (var dy = -rr; dy <= rr; dy++) for (var dx = -rr; dx <= rr; dx++) {
        if (Math.abs(Math.sqrt(dx * dx + dy * dy) - R) < hw) c.fillRect(o0 + dx * g.px, o0 + dy * g.px, g.px, g.px);
      }
      var o = Math.round(R * 0.5);
      c.fillRect(o0 - o * g.px, o0 - o * g.px, g.px * 2, g.px);
      c.fillRect(o0 - o * g.px, o0 - o * g.px + g.px, g.px, g.px);
      b.style.left = -o0 + "px"; b.style.top = -o0 + "px"; b.style.width = size + "px"; b.style.height = size + "px";
      b.style.transformOrigin = o0 + "px " + o0 + "px"; b.style.setProperty("--d", D);
      w.appendChild(b);

      var n = g.r >= 8 ? 7 : 5, sp = Math.max(4, Math.round(g.px * 1.1)), rad = R * g.px, a0 = rnd() * 6.28;
      for (var k = 0; k < n; k++) {
        var ang = a0 + (k / n) * Math.PI * 2, s = document.createElement("i");
        s.className = "lbub-s"; s.style.width = sp + "px"; s.style.height = sp + "px";
        s.style.background = col; s.style.boxShadow = "0 0 8px " + col;
        s.style.left = (Math.cos(ang) * rad - sp / 2) + "px"; s.style.top = (Math.sin(ang) * rad - sp / 2) + "px";
        s.style.setProperty("--dx", (Math.cos(ang) * rad * 0.85).toFixed(1) + "px");
        s.style.setProperty("--dy", (Math.sin(ang) * rad * 0.85).toFixed(1) + "px");
        s.style.setProperty("--d", D);
        w.appendChild(s);
      }
      stage.appendChild(w);
    });

    // cover-fit the 1920x1080 stage into the host (like object-fit: cover)
    function fit() {
      var s = Math.max(host.clientWidth / W, host.clientHeight / H);
      stage.style.transform = "scale(" + s + ") translate(-50%,-50%)";
    }
    fit();
    if (window.ResizeObserver) new ResizeObserver(fit).observe(host); else window.addEventListener("resize", fit);

    // pause the animations while off-screen to save CPU/battery
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (e) { host.classList.toggle("lbub-off", !e[0].isIntersecting); }).observe(host);
    }
  }

  function init() {
    if (!document.getElementById("lbub-css")) {
      var st = document.createElement("style"); st.id = "lbub-css"; st.textContent = CSS; document.head.appendChild(st);
    }
    var hosts = document.querySelectorAll("[data-bubbles]");
    for (var i = 0; i < hosts.length; i++) if (!hosts[i].classList.contains("lbub-root")) build(hosts[i]);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
