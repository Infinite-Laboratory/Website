// Click the logo: the goggles bounce and both lenses flash white three times, then the visitor
// goes to the homepage (or scrolls to the top when already there). The words never move.
const BOUNCE_MS = 560;
// [from ms, to ms, white?]
const STEPS: [number, number, boolean][] = [
  [0, 90, true],
  [90, 170, false],
  [170, 260, true],
  [260, 340, false],
  [340, 560, true],
];
const BOUNCE_KEYFRAMES: Keyframe[] = [
  { transform: 'translateY(0) scale(1,1)', offset: 0 },
  { transform: 'translateY(-9px) scale(.94,1.1)', offset: 0.3 },
  { transform: 'translateY(0) scale(1.08,.86)', offset: 0.55 },
  { transform: 'translateY(-4px) scale(.98,1.04)', offset: 0.75 },
  { transform: 'translateY(0) scale(1,1)', offset: 1 },
];

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let homeHref = '/';
const strip = (p: string) => p.replace(/\/index\.html$/, '/').replace(/([^/])\/+$/, '$1');
const onHome = () => strip(location.pathname) === strip(new URL(homeHref, location.href).pathname);

function goHome(smooth: boolean) {
  if (onHome()) window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
  else location.href = homeHref;
}

export function attachLogoClick(link: HTMLAnchorElement) {
  homeHref = link.getAttribute('href') ?? '/';
  const mark = link.querySelector<SVGElement>('.goggles');
  let busy = false;

  link.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (reducedMotion() || !mark) {
      // No animation: go straight home. Keep the page from reloading when already there.
      if (onHome()) {
        e.preventDefault();
        goHome(false);
      }
      return;
    }
    e.preventDefault();
    if (busy) return;
    busy = true;

    mark.animate(BOUNCE_KEYFRAMES, { duration: BOUNCE_MS, easing: 'ease-out' });
    const t0 = performance.now();
    let last: boolean | null = null;
    const step = (now: number) => {
      const t = now - t0;
      if (t >= BOUNCE_MS) {
        mark.removeAttribute('data-flash');
        busy = false;
        goHome(true);
        return;
      }
      const white = STEPS.find(([a, b]) => t >= a && t < b)?.[2] ?? false;
      if (white !== last) {
        last = white;
        if (white) mark.setAttribute('data-flash', '');
        else mark.removeAttribute('data-flash');
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}
