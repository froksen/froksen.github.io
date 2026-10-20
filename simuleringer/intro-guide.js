// ── Introduktionsguide ─────────────────────────────────────────────────────
// Kort rundvisning, der vises første gang man besøger en simulering.
// Brug:  IntroGuide.init({ key: 'straaling', steps: [{ target: '#id', title: '…', text: '…' }, …] })
// buttonAfter (valgfri): selektor for det element, knappen "Vis guide" placeres under.
// target kan udelades (trinnet vises så midt på skærmen) eller være en liste af selektorer.
(function () {
  const CSS = `
  .ig-spot {
    position: fixed; z-index: 9000; pointer-events: none;
    border-radius: 14px; border: 2px solid #f0c040;
    box-shadow: 0 0 0 9999px rgba(3,6,14,0.72), 0 0 24px rgba(240,192,64,0.45);
    transition: all 0.3s ease;
  }
  .ig-spot.ig-none { border-color: transparent; box-shadow: 0 0 0 9999px rgba(3,6,14,0.72); }
  .ig-catch { position: fixed; inset: 0; z-index: 8999; }
  .ig-box {
    position: fixed; z-index: 9001; width: min(340px, calc(100vw - 32px));
    background: #111827; color: #e2e8f0; border: 1px solid #f0c040; border-radius: 14px;
    padding: 18px 18px 14px; font-family: 'Exo 2', sans-serif;
    box-shadow: 0 12px 40px rgba(0,0,0,0.6);
    transition: top 0.3s ease, left 0.3s ease;
  }
  .ig-box h4 {
    font-family: 'Orbitron', monospace; font-size: 0.95rem; color: #f0c040;
    margin: 0 28px 8px 0; letter-spacing: 1px;
  }
  .ig-box p { font-size: 0.9rem; line-height: 1.5; margin: 0 0 14px; }
  .ig-close {
    position: absolute; top: 10px; right: 10px; width: 28px; height: 28px;
    background: none; border: none; color: #94a3b8; font-size: 1.1rem; cursor: pointer; border-radius: 6px;
  }
  .ig-close:hover { color: #e2e8f0; background: #1e293b; }
  .ig-dots { display: flex; gap: 6px; margin-bottom: 12px; }
  .ig-dots span { width: 8px; height: 8px; border-radius: 50%; background: #334155; }
  .ig-dots span.on { background: #f0c040; }
  .ig-row { display: flex; align-items: center; gap: 8px; }
  .ig-row .ig-skip { margin-right: auto; }
  .ig-btn {
    font-family: 'Exo 2', sans-serif; font-weight: 600; font-size: 0.85rem; cursor: pointer;
    padding: 8px 14px; border-radius: 8px; border: 1px solid #334155; background: #1e293b; color: #e2e8f0;
  }
  .ig-btn:hover { background: #334155; }
  .ig-btn.ig-primary { background: #f0c040; border-color: #f0c040; color: #0a0e1a; }
  .ig-btn.ig-primary:hover { filter: brightness(1.1); }
  .ig-skip { background: none; border: none; color: #94a3b8; text-decoration: underline; padding: 8px 0; }
  .ig-skip:hover { background: none; color: #e2e8f0; }
  .ig-help {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 7px 14px 7px 8px; border-radius: 999px; border: 1px solid #f0c040;
    background: rgba(240,192,64,0.1); color: #f0c040; cursor: pointer;
    font-family: 'Exo 2', sans-serif; font-size: 0.85rem; font-weight: 600;
    transition: background 0.2s;
  }
  .ig-help:hover { background: rgba(240,192,64,0.22); }
  .ig-help-icon {
    display: inline-flex; align-items: center; justify-content: center;
    width: 22px; height: 22px; border-radius: 50%; background: #f0c040; color: #0a0e1a;
    font-family: 'Orbitron', monospace; font-size: 0.8rem; font-weight: 700;
  }
  .ig-help-wrap { display: flex; justify-content: center; margin: -6px 0 16px; }
  .ig-help.ig-float { position: fixed; right: 16px; bottom: 16px; z-index: 8000; background: #111827; box-shadow: 0 4px 14px rgba(0,0,0,0.5); }
  @media (max-width: 600px) {
    .ig-box { left: 16px !important; right: 16px; top: auto !important; bottom: 16px; width: auto; }
  }`;

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return '1'; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  function init(opts) {
    const key = 'introSeen:' + opts.key;
    const steps = opts.steps;
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    // Knap til at vise guiden igen – under elementet i opts.buttonAfter, ellers fast i hjørnet
    const help = document.createElement('button');
    help.className = 'ig-help';
    help.innerHTML = '<span class="ig-help-icon">?</span>Vis guide';
    help.onclick = () => start();
    const anchor = opts.buttonAfter && document.querySelector(opts.buttonAfter);
    if (anchor) {
      const wrap = document.createElement('div');
      wrap.className = 'ig-help-wrap';
      wrap.appendChild(help);
      anchor.after(wrap);
    } else {
      help.classList.add('ig-float');
      document.body.appendChild(help);
    }

    let i = 0, spot, box, catcher;

    function rectOf(step) {
      if (!step.target) return null;
      const els = [].concat(step.target).map(s => document.querySelector(s)).filter(Boolean);
      if (!els.length) return null;
      const rs = els.map(e => e.getBoundingClientRect());
      const pad = 6;
      return {
        top: Math.min(...rs.map(r => r.top)) - pad,
        left: Math.min(...rs.map(r => r.left)) - pad,
        bottom: Math.max(...rs.map(r => r.bottom)) + pad,
        right: Math.max(...rs.map(r => r.right)) + pad,
      };
    }

    function place() {
      const step = steps[i];
      const r = rectOf(step);
      const vw = window.innerWidth, vh = window.innerHeight;
      if (!r) {
        spot.className = 'ig-spot ig-none';
        Object.assign(spot.style, { top: vh / 2 + 'px', left: vw / 2 + 'px', width: '0px', height: '0px' });
        box.style.top = Math.max(16, (vh - box.offsetHeight) / 2) + 'px';
        box.style.left = Math.max(16, (vw - box.offsetWidth) / 2) + 'px';
        return;
      }
      spot.className = 'ig-spot';
      Object.assign(spot.style, {
        top: r.top + 'px', left: r.left + 'px',
        width: (r.right - r.left) + 'px', height: (r.bottom - r.top) + 'px',
      });
      // Placér boksen under, over eller ved siden af det fremhævede område
      const bw = box.offsetWidth, bh = box.offsetHeight, gap = 12;
      let top;
      if (r.bottom + gap + bh <= vh - 16) top = r.bottom + gap;
      else if (r.top - gap - bh >= 16) top = r.top - gap - bh;
      else top = Math.max(16, vh - bh - 16);
      const left = Math.min(Math.max(16, r.left), vw - bw - 16);
      box.style.top = top + 'px';
      box.style.left = left + 'px';
    }

    function render() {
      const step = steps[i];
      const last = i === steps.length - 1;
      box.innerHTML = `
        <button class="ig-close" aria-label="Luk introduktion">✕</button>
        <div class="ig-dots">${steps.map((_, n) => `<span class="${n === i ? 'on' : ''}"></span>`).join('')}</div>
        <h4>${step.title}</h4>
        <p>${step.text}</p>
        <div class="ig-row">
          ${last ? '' : '<button class="ig-btn ig-skip">Spring over</button>'}
          ${i > 0 ? '<button class="ig-btn ig-back">Tilbage</button>' : ''}
          <button class="ig-btn ig-primary ig-next">${last ? 'Kom i gang' : 'Næste'}</button>
        </div>`;
      if (last) box.querySelector('.ig-row').style.justifyContent = 'flex-end';
      box.querySelector('.ig-close').onclick = end;
      const skip = box.querySelector('.ig-skip');
      if (skip) skip.onclick = end;
      const back = box.querySelector('.ig-back');
      if (back) back.onclick = () => go(i - 1);
      box.querySelector('.ig-next').onclick = () => (last ? end() : go(i + 1));

      const first = [].concat(step.target || []).map(s => document.querySelector(s)).find(Boolean);
      if (first) {
        const r = first.getBoundingClientRect();
        if (r.top < 0 || r.bottom > window.innerHeight) first.scrollIntoView({ block: 'center' });
      }
      place();
      box.querySelector('.ig-next').focus({ preventScroll: true });
    }

    function go(n) { i = n; render(); }

    function onKey(e) {
      if (e.key === 'Escape') end();
      else if (e.key === 'ArrowRight' && i < steps.length - 1) go(i + 1);
      else if (e.key === 'ArrowLeft' && i > 0) go(i - 1);
    }

    function start() {
      if (box) return;
      i = 0;
      catcher = document.createElement('div');
      catcher.className = 'ig-catch';
      catcher.onclick = end;
      spot = document.createElement('div');
      box = document.createElement('div');
      box.className = 'ig-box';
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-label', 'Introduktion');
      document.body.append(catcher, spot, box);
      window.addEventListener('resize', place);
      window.addEventListener('scroll', place, true);
      document.addEventListener('keydown', onKey);
      render();
    }

    function end() {
      if (!box) return;
      lsSet(key, '1');
      catcher.remove(); spot.remove(); box.remove();
      box = spot = catcher = null;
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      document.removeEventListener('keydown', onKey);
      help.focus({ preventScroll: true });
    }

    if (!lsGet(key)) {
      if (document.readyState === 'complete') start();
      else window.addEventListener('load', start);
    }
  }

  window.IntroGuide = { init };
})();
