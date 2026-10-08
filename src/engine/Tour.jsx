import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { SCENES, ROOMS, sceneIndex, roomIndex } from '../data/scenes.js';
import { SITE } from '../data/site.js';
import { coverRect, pickSrc, preload, getImage } from '../lib/images.js';
import { finePointer, onScroll, reducedMotion, scrollToEl } from '../lib/scroll.js';
import { cameraTransition } from './transitions.js';
import Hotspot from '../components/Hotspot.jsx';
import HotspotPanel from '../components/HotspotPanel.jsx';
import SceneNavigation from '../components/SceneNavigation.jsx';
import Icon from '../components/Icon.jsx';

const byId = Object.fromEntries(SCENES.map((s) => [s.id, s]));
const pad = (n) => String(n).padStart(2, '0');
// zones where no hotspot is drawn (header on top, room indicator at the bottom)
const safeZone = () => ({ side: 28, top: 64, bottom: 110 });

/** Pixel position of an image-space point (in %) inside the stage. */
function pointOnStage(scene, pt, size) {
  const r = coverRect(scene.image, size.w, size.h, scene.focus);
  return { x: r.left + (pt.x / 100) * r.width, y: r.top + (pt.y / 100) * r.height };
}

export const firstAssets = (w = window.innerWidth, h = window.innerHeight) =>
  SCENES.slice(0, 2).map((s) => pickSrc(s.image, coverRect(s.image, w, h, s.focus).width));

function SceneLayer({ scene, size, layerRef, camRef, hotspots }) {
  const r = scene ? coverRect(scene.image, size.w, size.h, scene.focus) : null;
  return (
    <div className="tour__layer" ref={layerRef}>
      <div className="tour__cam" ref={camRef}>
        {scene && (
          <img
            className={`tour__img${scene.tone ? ` tone-${scene.tone}` : ''}`}
            src={pickSrc(scene.image, r.width)}
            alt={scene.alt ?? `${scene.title ?? 'Châtel'} — ${SITE.name}`}
            width={getImage(scene.image).width}
            height={getImage(scene.image).height}
            style={{ left: r.left, top: r.top, width: r.width, height: r.height }}
            draggable="false"
            decoding="async"
          />
        )}
        {hotspots}
      </div>
    </div>
  );
}

export default function Tour({ ready }) {
  const trackRef = useRef(null);
  const stageRef = useRef(null);
  const worldRef = useRef(null);
  const uiRef = useRef(null);
  const panelRef = useRef(null);
  const layerRefs = [useRef(null), useRef(null)];
  const camRefs = [useRef(null), useRef(null)];

  const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  const [layers, setLayers] = useState([SCENES[0].id, null]);
  const [front, setFront] = useState(0);
  const [current, setCurrent] = useState(SCENES[0].id);
  const [uiId, setUiId] = useState(SCENES[0].id);
  const [settled, setSettled] = useState(false);
  const [openHs, setOpenHs] = useState(null);
  const [exclude, setExclude] = useState([]); // rects hotspots must avoid (text, logo, menu button)
  // mobile: long scene texts are clamped, « Lire la suite » unfolds them
  const textRef = useRef(null);
  const [clamped, setClamped] = useState(false);
  const [more, setMore] = useState(false);

  const busy = useRef(false);
  const pending = useRef(null);
  const live = useRef({});
  live.current = { size };
  // authoritative navigation state (state above only drives rendering)
  const curRef = useRef(SCENES[0].id);
  const frontRef = useRef(0);
  const desired = useRef(SCENES[0].id); // scene the scroll position asks for
  const originFor = useRef(null); // { id, origin } — camera target for a hotspot passage
  const forced = useRef(null); // scene being reached by a programmatic scroll
  const readyRef = useRef(false);

  const ui = byId[uiId];
  const scene = byId[current];

  // ── stage size ───────────────────────────────────────────
  useLayoutEffect(() => {
    const ro = new ResizeObserver(([e]) => {
      const { width: w, height: h } = e.contentRect;
      setSize((s) => (Math.abs(s.w - w) < 1 && Math.abs(s.h - h) < 1 ? s : { w, h }));
    });
    ro.observe(stageRef.current);
    gsap.set(layerRefs[1].current, { autoAlpha: 0 });
    gsap.set(uiRef.current.querySelectorAll('[data-reveal]'), { autoAlpha: 0, y: 24 });
    return () => ro.disconnect();
  }, []);

  // ── intro, once the loader is gone ───────────────────────
  useEffect(() => {
    if (!ready) return;
    readyRef.current = true;
    const rm = reducedMotion();
    gsap.fromTo(camRefs[0].current, { scale: rm ? 1 : 1.14 }, { scale: 1, duration: rm ? 0 : 2.8, ease: 'power2.out' });
    revealUI(rm ? 0 : 0.5).then(() => {
      setSettled(true);
      pump();
    });
  }, [ready]);

  const revealUI = (delay = 0.15) =>
    gsap.fromTo(
      uiRef.current.querySelectorAll('[data-reveal]'),
      { autoAlpha: 0, y: 24 },
      { autoAlpha: 1, y: 0, duration: 1, stagger: 0.08, ease: 'power3.out', delay },
    );

  const hideUI = () =>
    gsap.to(uiRef.current.querySelectorAll('[data-reveal]'), {
      autoAlpha: 0, y: -12, duration: 0.4, stagger: 0.03, ease: 'power2.in',
    });

  // ── navigation ───────────────────────────────────────────
  const goTo = async (id, opts = {}) => {
    const { size } = live.current;
    const current = curRef.current;
    const front = frontRef.current;
    if (busy.current || id === current || !byId[id]) return;
    busy.current = true;
    setOpenHs(null);
    setSettled(false);
    const to = byId[id];
    const r = coverRect(to.image, size.w, size.h, to.focus);
    await Promise.all([preload(pickSrc(to.image, r.width)), hideUI()]);
    pending.current = { from: current, to: id, origin: opts.origin };
    setLayers((l) => {
      const n = [...l];
      n[1 - front] = id;
      return n;
    });
  };

  // start the transition towards the desired scene, if we're free to
  function pump() {
    if (busy.current || !readyRef.current) return;
    const id = desired.current;
    if (id === curRef.current) return;
    const o = originFor.current?.id === id ? originFor.current.origin : undefined;
    originFor.current = null;
    goTo(id, { origin: o });
  }

  function request(id, opts = {}) {
    desired.current = id;
    if (opts.origin) originFor.current = { id, origin: opts.origin };
    pump();
  }

  // ── the tour is driven by the scroll position ────────────
  // the track is (N − 1) segments taller than the sticky stage; scene i sits at segment i
  const segment = () => (trackRef.current.offsetHeight - stageRef.current.offsetHeight) / (SCENES.length - 1);
  const anchorY = (i) => trackRef.current.getBoundingClientRect().top + window.scrollY + i * segment();

  /** Every button / swipe / key goes through here: scroll to the scene, the scene follows. */
  const navigate = useCallback((id, opts = {}) => {
    const i = sceneIndex(id);
    if (i < 0) return;
    forced.current = id;
    request(id, opts);
    scrollToEl(anchorY(i), { duration: 1.1 }).then(() => {
      if (forced.current === id) forced.current = null;
    });
  }, []);

  useEffect(() => {
    const N = SCENES.length;
    const rm = reducedMotion();
    gsap.set(worldRef.current, { scale: 1.04 });
    const qs = rm ? null : gsap.quickTo(worldRef.current, 'scale', { duration: 0.6, ease: 'power2.out' });
    let idle = 0;
    let touching = false;
    let lastRel = 0;

    const snap = (i) => {
      if (touching || forced.current) return;
      const y = anchorY(i);
      if (Math.abs(window.scrollY - y) > 3) scrollToEl(y, { duration: 0.7 });
    };
    const update = () => {
      const rel = -trackRef.current.getBoundingClientRect().top / segment();
      // switch after 30 % of a segment in the direction of the gesture, so a short flick is enough
      const goingUp = rel < lastRel - 0.001;
      lastRel = rel;
      const i = Math.max(0, Math.min(N - 1, goingUp ? Math.ceil(rel - 0.7) : Math.floor(rel + 0.7)));
      if (!forced.current) request(SCENES[i].id);
      // the camera leans forward while you scroll towards the next scene
      qs?.(1.04 + Math.max(-0.04, Math.min(0.04, (rel - i) * 0.12)));
      trackRef.current.style.setProperty('--progress', Math.max(0, Math.min(1, rel / (N - 1))).toFixed(4));
      clearTimeout(idle);
      if (!touching && !forced.current && rel > -0.5 && rel < N - 1.02) idle = setTimeout(() => snap(i), 200);
    };
    const down = () => {
      touching = true;
      clearTimeout(idle);
    };
    const up = () => {
      touching = false;
      update();
    };
    const off = onScroll(update);
    window.addEventListener('touchstart', down, { passive: true });
    window.addEventListener('touchend', up, { passive: true });
    window.addEventListener('touchcancel', up, { passive: true });
    update();
    return () => {
      off?.();
      clearTimeout(idle);
      window.removeEventListener('touchstart', down);
      window.removeEventListener('touchend', up);
      window.removeEventListener('touchcancel', up);
    };
  }, []);

  // runs right after the incoming layer has been rendered
  useLayoutEffect(() => {
    const p = pending.current;
    if (!p) return;
    pending.current = null;
    const { size } = live.current;
    const front = frontRef.current;
    const back = 1 - front;
    const from = byId[p.from];
    const to = byId[p.to];
    const fi = sceneIndex(p.from);
    const ti = sceneIndex(p.to);
    const type = reducedMotion() ? 'fade' : from.room === to.room ? 'turn' : ti > fi ? 'advance' : 'retreat';
    const origin = pointOnStage(from, p.origin ?? from.enter ?? { x: 50, y: 50 }, size);

    cameraTransition({
      type,
      dir: ti > fi ? 1 : -1,
      origin,
      size,
      from: { layer: layerRefs[front].current, cam: camRefs[front].current },
      to: { layer: layerRefs[back].current, cam: camRefs[back].current },
      onMidway: () => setUiId(p.to),
      onComplete: () => {
        frontRef.current = back;
        curRef.current = p.to;
        setFront(back);
        setCurrent(p.to);
        busy.current = false;
        setSettled(true);
        pump(); // the scroll may already ask for another scene
      },
    });
  }, [layers]);

  // new text block (set midway through a transition) → reveal it
  useLayoutEffect(() => {
    if (busy.current) revealUI(0.1);
  }, [uiId]);

  const step = useCallback(
    (d) => {
      const i = sceneIndex(desired.current) + d;
      if (i >= SCENES.length) return scrollToEl('#appartement');
      if (i >= 0) navigate(SCENES[i].id);
    },
    [navigate],
  );

  // ── preload the neighbours of the current scene ──────────
  useEffect(() => {
    const i = sceneIndex(current);
    const s = byId[current];
    const ids = [SCENES[i + 1]?.id, SCENES[i - 1]?.id, s.cta?.target, ...s.hotspots.map((h) => h.target)].filter(Boolean);
    const t = setTimeout(() => {
      new Set(ids).forEach((id) => {
        const n = byId[id];
        preload(pickSrc(n.image, coverRect(n.image, size.w, size.h, n.focus).width));
      });
    }, 300);
    return () => clearTimeout(t);
  }, [current, size]);

  useLayoutEffect(() => {
    setMore(false);
  }, [uiId]);
  useLayoutEffect(() => {
    const t = textRef.current;
    setClamped(Boolean(t) && !more && t.scrollHeight > t.clientHeight + 2);
  }, [uiId, size, more]);

  // ── areas covered by the UI: keep hotspots out of them ───
  useLayoutEffect(() => {
    if (!stageRef.current) return;
    const b = stageRef.current.getBoundingClientRect();
    const rect = (el, m) => {
      if (!el) return null;
      const a = el.getBoundingClientRect();
      return { left: a.left - b.left, right: a.right - b.left, top: a.top - b.top, bottom: a.bottom - b.top, m };
    };
    setExclude(
      [rect(panelRef.current, 24), rect(document.querySelector('.header .logo'), 12), rect(document.querySelector('.burger'), 12)].filter(Boolean),
    );
  }, [uiId, size, settled, more]);

  // ── mouse: subtle depth ──────────────────────────────────
  useEffect(() => {
    if (!finePointer() || reducedMotion()) return;
    const el = worldRef.current;
    const qx = gsap.quickTo(el, 'x', { duration: 1.4, ease: 'power3.out' });
    const qy = gsap.quickTo(el, 'y', { duration: 1.4, ease: 'power3.out' });
    const move = (e) => {
      const r = stageRef.current.getBoundingClientRect();
      if (e.clientY > r.bottom) return;
      qx(-((e.clientX - r.left) / r.width - 0.5) * 26);
      qy(-((e.clientY - r.top) / r.height - 0.5) * 16);
    };
    window.addEventListener('mousemove', move, { passive: true });
    return () => window.removeEventListener('mousemove', move);
  }, []);

  // ── keyboard (only while the tour is on screen) ──────────
  useEffect(() => {
    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.intersectionRatio > 0.5), { threshold: [0, 0.5, 1] });
    io.observe(stageRef.current);
    const key = (e) => {
      if (!visible || e.target.closest?.('input, textarea, select')) return;
      if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'Escape') setOpenHs(null);
    };
    window.addEventListener('keydown', key);
    return () => {
      io.disconnect();
      window.removeEventListener('keydown', key);
    };
  }, [step]);

  // ── touch: horizontal swipe, vertical scroll untouched ───
  const swipe = useRef(null);
  const onPointerDown = (e) => {
    if (e.pointerType !== 'touch' || e.target.closest('button, a')) return;
    swipe.current = { x: e.clientX, y: e.clientY, t: performance.now() };
  };
  const onPointerUp = (e) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4 && performance.now() - s.t < 800) step(dx < 0 ? 1 : -1);
  };

  // ── requests from the rest of the page ───────────────────
  useEffect(() => {
    const onGoto = (e) => navigate(e.detail);
    window.addEventListener('tour:goto', onGoto);
    return () => window.removeEventListener('tour:goto', onGoto);
  }, [navigate]);

  // ── hotspots of the scene in front ───────────────────────
  const renderHotspots = (s) => {
    const SAFE = safeZone();
    const blocked = (x, y) => exclude.some((r) => x > r.left - r.m && x < r.right + r.m && y > r.top - r.m && y < r.bottom + r.m);
    // screen box of a hotspot; passages carry a visible label
    const box = (h, x, y, flip) => {
      const w = 44 + (h.target ? h.title.length * 7.4 + 30 : 0);
      return flip ? { l: x + 22 - w, r: x + 22, t: y - 22, b: y + 22 } : { l: x - 22, r: x - 22 + w, t: y - 22, b: y + 22 };
    };
    const placed = [];
    const overlaps = (a) => placed.some((o) => a.l < o.r && a.r > o.l && a.t < o.b && a.b > o.t);
    // plain hotspots first; passages are placed afterwards and make room
    const order = s.hotspots.map((h, i) => ({ h, i })).sort((a, b) => Boolean(a.h.target) - Boolean(b.h.target));
    const out = [];
    for (const { h, i } of order) {
      const p = pointOnStage(s, h, size);
      const inFrame = p.x > SAFE.side && p.x < size.w - SAFE.side && p.y > SAFE.top && p.y < size.h - SAFE.bottom;
      if (!inFrame && !h.target) continue;
      // a passage outside the frame is pinned to the edge it lies beyond
      if (!inFrame) {
        p.x = Math.min(size.w - SAFE.side - 22, Math.max(SAFE.side + 22, p.x));
        p.y = Math.min(size.h - SAFE.bottom - 22, Math.max(SAFE.top + 22, p.y));
      }
      const flip = p.x > size.w * 0.62;
      if (h.target) {
        // slide the passage up or down until it is free
        const y0 = p.y;
        const free = [0, 48, -48, 96, -96, 144, -144, 192, -192]
          .map((d) => y0 + d)
          .find((y) => y > SAFE.top + 22 && y < size.h - SAFE.bottom - 22 && !blocked(p.x, y) && !overlaps(box(h, p.x, y, flip)));
        if (free === undefined) continue;
        p.y = free;
      } else if (blocked(p.x, p.y) || overlaps(box(h, p.x, p.y, flip))) continue;
      placed.push(box(h, p.x, p.y, flip));
      out.push(
        <Hotspot
          key={`${s.id}-${h.id}`}
          hotspot={h}
          x={p.x}
          y={p.y}
          index={i}
          flip={flip}
          open={openHs === h.id}
          onClick={() => (h.target ? navigate(h.target, { origin: h }) : setOpenHs((o) => (o === h.id ? null : h.id)))}
        />,
      );
    }
    return out;
  };

  const onCta = () => {
    const c = ui.cta;
    if (c.hotspot) setOpenHs(c.hotspot);
    else if (c.target) navigate(c.target);
    else if (c.href) scrollToEl(c.href);
  };

  const roomScenes = SCENES.filter((s) => s.room === ui.room);
  const ri = roomIndex(ui.room);
  const hs = openHs && scene.hotspots.find((h) => h.id === openHs);
  const hsPos = hs && pointOnStage(scene, hs, size);
  const idx = sceneIndex(current);

  return (
    <div id="top" className="tour-track" ref={trackRef} style={{ '--n': SCENES.length }}>
      <section
        ref={stageRef}
        className={`tour${ui.hero ? ' is-hero' : ''}${settled ? ' is-settled' : ''}${openHs ? ' has-sheet' : ''}`}
        aria-roledescription="visite"
        aria-label={`Visite de la ${SITE.name}`}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (swipe.current = null)}
        data-cursor="view"
      >
        <div className="tour__world" ref={worldRef}>
          {[0, 1].map((i) => (
            <SceneLayer
              key={i}
              scene={byId[layers[i]]}
              size={size}
              layerRef={layerRefs[i]}
              camRef={camRefs[i]}
              hotspots={
                i === front && settled && !ui.hero ? <div className="hotspots">{renderHotspots(byId[layers[i]])}</div> : null
              }
            />
          ))}
        </div>
        <div className="tour__shade" aria-hidden="true" />

        <div className={`tour__ui${ui.panel === 'right' ? ' tour__ui--right' : ''}`} ref={uiRef}>
          {ui.hero ? (
            <div className="hero" ref={panelRef} key="hero">
              <p className="kicker" data-reveal>
                {SITE.name} · {SITE.place}
              </p>
              <h1 className="hero__title">
                {SITE.tagline.map((l) => (
                  <span className="hero__line" data-reveal key={l}>
                    {l}
                  </span>
                ))}
              </h1>
              <p className="hero__intro" data-reveal>
                {SITE.intro}
              </p>
              <div data-reveal className="hero__actions">
                <button className="btn" onClick={() => navigate(SCENES[1].id)} data-cursor="explore">
                  Entrer dans la résidence <Icon name="chevron" size={16} />
                </button>
                <span className="hero__hint" aria-hidden="true">
                  <span className="hero__hint-line" />
                  ou faites défiler
                </span>
              </div>
            </div>
          ) : (
            <div className="scene-panel" ref={panelRef} key={ui.id}>
              <p className="kicker" data-reveal>
                {pad(ri + 1)} / {pad(ROOMS.length)}
                {roomScenes.length > 1 && (
                  <span className="scene-panel__sub">
                    {' '}— {pad(roomScenes.indexOf(ui) + 1)} / {pad(roomScenes.length)}
                  </span>
                )}
              </p>
              <h2 className="scene-panel__title" data-reveal>
                {ui.title}
              </h2>
              <div data-reveal>
                <p ref={textRef} id="scene-text" className={`scene-panel__text${more ? ' is-open' : ''}`}>
                  {ui.text}
                </p>
                {(clamped || more) && (
                  <button
                    type="button"
                    className="link-btn scene-panel__more"
                    aria-expanded={more}
                    aria-controls="scene-text"
                    onClick={() => setMore((m) => !m)}
                  >
                    {more ? 'Réduire' : 'Lire la suite'}
                  </button>
                )}
              </div>
              {ui.cta && (
                <div data-reveal>
                  <button className="btn" onClick={onCta} data-cursor="explore">
                    {ui.cta.label} <Icon name="chevron" size={16} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {!ui.hero && (
          <>
            <button className="tour__arrow tour__arrow--prev" onClick={() => step(-1)} aria-label="Scène précédente" data-cursor="explore">
              <Icon name="arrowLeft" size={18} />
            </button>
            <button className="tour__arrow tour__arrow--next" onClick={() => step(1)} aria-label="Scène suivante" data-cursor="explore">
              <Icon name="arrow" size={18} />
            </button>
          </>
        )}

        <SceneNavigation
          active={ui.room}
          onSelect={(room) => {
            if (room.href) return scrollToEl(room.href);
            const target = SCENES.find((s) => s.room === room.id);
            navigate(target.id);
          }}
        />

        <a href="#appartement" className="tour__cue" data-cursor="explore">
          <span className="tour__cue-ring">
            <Icon name="down" size={14} />
          </span>
          Découvrir
        </a>

        {hs && !hs.target && (
          <HotspotPanel
            hotspot={hs}
            x={hsPos.x}
            y={hsPos.y}
            flip={hsPos.x > size.w * 0.55}
            mobile={size.w < 720}
            onClose={() => setOpenHs(null)}
          />
        )}

        <span className="tour__progress" aria-hidden="true" />

        <p className="sr-only" aria-live="polite">
          {ui.hero ? 'Extérieur' : ui.title} — scène {idx + 1} sur {SCENES.length}
        </p>
      </section>
    </div>
  );
}
