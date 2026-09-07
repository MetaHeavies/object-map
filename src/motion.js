import { animate, createSpring } from "animejs";
const active = new Map();
export const treatments = {
  restrained: { label: "Restrained", duration: 300, ease: "outQuart" },
  elastic: {
    label: "Elastic separation",
    duration: 550,
    ease: createSpring({ stiffness: 180, damping: 19, mass: 1 }),
  },
  momentum: { label: "Momentum", duration: 420, ease: "outExpo" },
};
export function capture() {
  const boxes = new Map();
  document.querySelectorAll("[data-motion-id]").forEach((el) =>
    boxes.set(el.dataset.motionId, {
      rect: el.getBoundingClientRect(),
      width: el.offsetWidth,
      el,
    }),
  );
  return boxes;
}
export function transform(before, treatment = "restrained") {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const elements = [...document.querySelectorAll("[data-motion-id]")];
  const currentIds = new Set(elements.map((el) => el.dataset.motionId));
  if (!reduce && before)
    for (const [id, old] of before) {
      if (currentIds.has(id) || !old.el.classList.contains("object-card"))
        continue;
      const wrapper = document.createElement("div"),
        ghost = old.el.cloneNode(true);
      wrapper.setAttribute("aria-hidden", "true");
      Object.assign(wrapper.style, {
        position: "fixed",
        left: `${old.rect.left}px`,
        top: `${old.rect.top}px`,
        width: `${old.rect.width}px`,
        height: `${old.rect.height}px`,
        pointerEvents: "none",
        zIndex: 10,
      });
      ghost.removeAttribute("data-motion-id");
      ghost
        .querySelectorAll("[data-motion-id]")
        .forEach((el) => el.removeAttribute("data-motion-id"));
      Object.assign(ghost.style, {
        left: "0",
        top: "0",
        width: `${old.width}px`,
        transformOrigin: "top left",
        transform: `scale(${old.rect.width / old.width})`,
      });
      wrapper.append(ghost);
      document.body.append(wrapper);
      animate(wrapper, {
        opacity: [1, 0],
        scale: [1, 0.94],
        duration: 180,
        ease: "outQuad",
        onComplete: () => wrapper.remove(),
      });
    }
  for (const el of elements) {
    const id = el.dataset.motionId,
      old = before?.get(id);
    active.get(id)?.pause();
    el.style.transform = "";
    if (!old) {
      if (!reduce)
        animate(el, {
          opacity: [0.5, Number(getComputedStyle(el).opacity)],
          translateY: [-6, 0],
          duration: 160,
          ease: "outQuad",
          onComplete: () => {
            el.style.removeProperty("opacity");
            el.style.removeProperty("transform");
          },
        });
      continue;
    }
    const next = el.getBoundingClientRect(),
      a = old.rect;
    if (!next.width || !next.height || reduce) continue;
    const parent = el.parentElement.closest("[data-motion-id]");
    if (
      parent &&
      before.has(parent.dataset.motionId) &&
      !el.classList.contains("object-card") &&
      !old.el.classList.contains("object-card")
    )
      continue;
    const scale = Number(el.closest("[data-zoom]")?.dataset.zoom || 1),
      dx = (a.left - next.left) / scale,
      dy = (a.top - next.top) / scale;
    if (
      Math.abs(dx) +
        Math.abs(dy) +
        Math.abs(a.width - next.width) +
        Math.abs(a.height - next.height) <
      1
    )
      continue;
    const options = treatments[treatment];
    // Only a semantic promotion/demotion changes proportions. Ordinary list
    // growth must not squash every label in its parent object.
    const changesShape =
      old.el.classList.contains("object-card") !==
      el.classList.contains("object-card");
    el.style.transformOrigin = "top left";
    const animation = animate(el, {
      translateX: [dx, 0],
      translateY: [dy, 0],
      scaleX: [changesShape ? a.width / next.width : 1, 1],
      scaleY: [changesShape ? a.height / next.height : 1, 1],
      duration: options.duration,
      ease: options.ease,
      onComplete: () => {
        el.style.transform = "";
        active.delete(id);
      },
    });
    active.set(id, animation);
  }
}
export const motion = {
  capture,
  expand: transform,
  contract: transform,
  promote: transform,
  demote: transform,
  reflow: transform,
  focus: transform,
  connect: transform,
  detach: transform,
  settle: transform,
};
