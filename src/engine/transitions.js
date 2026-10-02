import gsap from 'gsap';

// Camera moves between two scenes. Each one has a spatial reason:
//   advance — walk forward into the next room, towards a door / point of the photo
//   turn    — same room, the head turns left or right
//   retreat — step back to a previous room
//   fade    — prefers-reduced-motion
//
// Both scenes live in their own layer (`layer` = visibility, `cam` = transform).

// cubic in-out, the same curve as cubic-bezier(0.65, 0, 0.35, 1)
gsap.registerEase('walk', (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2));

export function cameraTransition({ type, dir, origin, size, from, to, onMidway, onComplete }) {
  const tl = gsap.timeline({
    defaults: { ease: 'walk' },
    onComplete: () => {
      gsap.set(from.layer, { autoAlpha: 0, zIndex: 0 });
      gsap.set(from.cam, { clearProps: 'transform,filter,transformOrigin' });
      gsap.set(to.layer, { zIndex: 1 });
      gsap.set(to.cam, { clearProps: 'filter' });
      onComplete?.();
    },
  });

  gsap.set(from.layer, { zIndex: 1, autoAlpha: 1 });
  gsap.set(to.layer, { zIndex: 2, autoAlpha: 0 });
  gsap.set(to.cam, { clearProps: 'transform', transformOrigin: '50% 50%' });

  if (type === 'fade') {
    tl.to(to.layer, { autoAlpha: 1, duration: 0.5, ease: 'none' }).call(onMidway, null, 0.2);
    return tl;
  }

  if (type === 'advance') {
    // the camera walks towards `origin`: zoom + drift of that point to the centre
    const dx = (size.w / 2 - origin.x) * 0.22;
    const dy = (size.h / 2 - origin.y) * 0.22;
    gsap.set(from.cam, { transformOrigin: `${origin.x}px ${origin.y}px` });
    tl.to(from.cam, { scale: 1.22, x: dx, y: dy, filter: 'blur(9px)', duration: 1.5, ease: 'power2.in' }, 0)
      .fromTo(to.cam, { scale: 1.1, filter: 'blur(8px)' }, { scale: 1, filter: 'blur(0px)', duration: 1.25, ease: 'power3.out' }, 0.85)
      .to(to.layer, { autoAlpha: 1, duration: 0.65, ease: 'power1.inOut' }, 0.85)
      .call(onMidway, null, 1.05);
    return tl;
  }

  if (type === 'retreat') {
    tl.to(from.cam, { scale: 0.93, filter: 'blur(7px)', duration: 1.1, ease: 'power2.in' }, 0)
      .fromTo(to.cam, { scale: 1.12, filter: 'blur(7px)' }, { scale: 1, filter: 'blur(0px)', duration: 1.25, ease: 'power3.out' }, 0.55)
      .to(to.layer, { autoAlpha: 1, duration: 0.6, ease: 'power1.inOut' }, 0.55)
      .call(onMidway, null, 0.8);
    return tl;
  }

  // turn: pan the gaze sideways
  tl.to(from.cam, { xPercent: -7 * dir, scale: 1.08, filter: 'blur(6px)', duration: 1.2 }, 0)
    .fromTo(
      to.cam,
      { xPercent: 7 * dir, scale: 1.08, filter: 'blur(6px)' },
      { xPercent: 0, scale: 1, filter: 'blur(0px)', duration: 1.3, ease: 'power3.out' },
      0.45,
    )
    .to(to.layer, { autoAlpha: 1, duration: 0.7, ease: 'power1.inOut' }, 0.45)
    .call(onMidway, null, 0.75);
  return tl;
}
