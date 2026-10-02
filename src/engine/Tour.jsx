import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { SCENES, ROOMS, sceneIndex, roomIndex } from '../data/scenes.js';
import { SITE } from '../data/site.js';
import { coverRect, pickSrc, preload, getImage } from '../lib/images.js';
import { finePointer, reducedMotion, scrollToEl } from '../lib/scroll.js';
import { cameraTransition } from './transitions.js';
import Hotspot from '../components/Hotspot.jsx';
import HotspotPanel from '../components/HotspotPanel.jsx';
import SceneNavigation from '../components/SceneNavigation.jsx';
import Icon from '../components/Icon.jsx';

const byId = Object.fromEntries(SCENES.map((s) => [s.id, s]));
const pad = (n) => String(n).padStart(2, '0');
const SAFE = { side: 28, top: 84, bottom: 110 }; // zones où l'on n'affiche pas de hotspot

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
  const [exclude, setExclude] = useState(null);

  const busy = useRef(false);
  const pending = useRef(null);
  const live = useRef({});
  live.current = { current, front, size };

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
    const rm = reducedMotion();
    gsap.fromTo(camRefs[0].current, { scale: rm ? 1 : 1.14 }, { scale: 1, duration: rm ? 0 : 2.8, ease: 'power2.out' });
    revealUI(rm ? 0 : 0.5).then(() => setSettled(true));
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
  const goTo = useCallback(async (id, opts = {}) => {
    const { current, front, size } = live.current;
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
  }, []);

  // runs right after the incoming layer has been rendered
  useLayoutEffect(() => {
    const p = pending.current;
    if (!p) return;
    pending.current = null;
    const { front, size } = live.current;
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
        setFront(back);
        setCurrent(p.to);
        busy.current = false;
        setSettled(true);
      },
    });
  }, [layers]);

  // new text block (set midway through a transition) → reveal it
  useLayoutEffect(() => {
    if (busy.current) revealUI(0.1);
  }, [uiId]);

  const step = useCallback(
    (d) => {
      const i = sceneIndex(live.current.current) + d;
      if (i >= SCENES.length) return scrollToEl('#appartement');
      if (i >= 0) goTo(SCENES[i].id);
    },
    [goTo],
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

  // ── text panel area: keep hotspots out of it ─────────────
  useLayoutEffect(() => {
    if (!panelRef.current || !stageRef.current) return;
    const a = panelRef.current.getBoundingClientRect();
    const b = stageRef.current.getBoundingClientRect();
    setExclude({ left: a.left - b.left, right: a.right - b.left, top: a.top - b.top, bottom: a.bottom - b.top });
  }, [uiId, size, settled]);

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
    const onGoto = async (e) => {
      await scrollToEl(0);
      goTo(e.detail);
    };
    window.addEventListener('tour:goto', onGoto);
    return () => window.removeEventListener('tour:goto', onGoto);
  }, [goTo]);

  // ── hotspots of the scene in front ───────────────────────
  const renderHotspots = (s) =>
    s.hotspots.map((h, i) => {
      const p = pointOnStage(s, h, size);
      const inFrame = p.x > SAFE.side && p.x < size.w - SAFE.side && p.y > SAFE.top && p.y < size.h - SAFE.bottom;
      // a passage outside the frame is pinned to the edge it lies beyond
      if (!inFrame && h.target) {
        p.x = Math.min(size.w - SAFE.side - 22, Math.max(SAFE.side + 22, p.x));
        p.y = Math.min(size.h - SAFE.bottom - 22, Math.max(SAFE.top + 22, p.y));
      } else if (!inFrame) return null;
      const ex = exclude;
      if (ex && p.x > ex.left - 30 && p.x < ex.right + 30 && p.y > ex.top - 30 && p.y < ex.bottom + 30) return null;
      return (
        <Hotspot
          key={`${s.id}-${h.id}`}
          hotspot={h}
          x={p.x}
          y={p.y}
          index={i}
          flip={p.x > size.w * 0.62}
          open={openHs === h.id}
          onClick={() => (h.target ? goTo(h.target, { origin: h }) : setOpenHs((o) => (o === h.id ? null : h.id)))}
        />
      );
    });

  const onCta = () => {
    const c = ui.cta;
    if (c.hotspot) setOpenHs(c.hotspot);
    else if (c.target) goTo(c.target);
    else if (c.href) scrollToEl(c.href);
  };

  const roomScenes = SCENES.filter((s) => s.room === ui.room);
  const ri = roomIndex(ui.room);
  const hs = openHs && scene.hotspots.find((h) => h.id === openHs);
  const hsPos = hs && pointOnStage(scene, hs, size);
  const idx = sceneIndex(current);

  return (
    <section
      id="top"
      ref={stageRef}
      className={`tour${ui.hero ? ' is-hero' : ''}${settled ? ' is-settled' : ''}`}
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
            <div data-reveal>
              <button className="btn" onClick={() => goTo(SCENES[1].id)} data-cursor="explore">
                Entrer dans la résidence <Icon name="chevron" size={16} />
              </button>
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
            <p className="scene-panel__text" data-reveal>
              {ui.text}
            </p>
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
          goTo(target.id);
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

      <p className="sr-only" aria-live="polite">
        {ui.hero ? 'Extérieur' : ui.title} — scène {idx + 1} sur {SCENES.length}
      </p>
    </section>
  );
}
