import { useEffect, useLayoutEffect, useRef, useState } from "react";

// The guide explains what the primitives mean, not how to drive the canvas.
// The agent maintains the map; the builder has to be able to read it.
export const steps = [
  {
    title: "What you are looking at",
    body: "Every column is one thing your product is made of. Read across them and you can see the whole product as its users meet it, without opening the code.",
  },
  {
    target: '[data-object-id="obj:book"] .object-heading',
    title: "An object is a thing people recognise",
    body: "Book is a thing someone can name, look for and act on. Products are usually made of five to fifteen of these. If you cannot picture one, it is probably not an object.",
  },
  {
    target: '[data-motion-id="obj:book/attr:title"]',
    title: "Attributes are what the thing is",
    body: "Title, ISBN, Cover. Information that belongs to this thing and has no life of its own — nobody browses a list of titles as though titles were the point.",
  },
  {
    target: '[data-motion-id="obj:book/rel:author"]',
    title: "Relationships are how things connect",
    body: "Author is its own column, so this is a link rather than a field. The label says what the link means: a book is written by an author. A link labelled just “Author” would say they are related and nothing more.",
  },
  {
    target: '[data-motion-id="obj:book/rel:translator"]',
    title: "The same thing can appear twice",
    body: "Written by and Translated by both point at Author. Two different meanings, one object. This is the distinction a plain field would lose.",
  },
  {
    target: '[data-motion-id="obj:book/action:borrow"]',
    title: "Actions are what someone can do",
    body: "Borrow, Place hold, Return. Actions belong to the thing they act on, which is how you notice an object nobody can do anything with.",
  },
  {
    target: '[data-motion-id="obj:book/state:on-loan"]',
    title: "States are where a thing is in its life",
    body: "Available, On loan, Overdue. A state changes over time and usually gates what can be done next — you cannot borrow a book that is already on loan.",
  },
  {
    target: '[data-object-id="obj:hold"] .object-heading',
    title: "Some of it is not built yet",
    body: "Hold is on the map because the brief asked for it, not because code exists. Intentions stay visible until they are built or dropped, so nothing quietly disappears between conversations.",
  },
  {
    title: "What it is for",
    body: "Look for the object that carries everything and the ones that carry nothing, a concept sitting in two places under two names, an action with nowhere to happen. Those are the questions worth taking back to the agent.",
  },
];

function useAnchor(target, index) {
  const [rect, setRect] = useState(null);
  useLayoutEffect(() => {
    if (!target) return setRect(null);
    const measure = () => {
      const node = document.querySelector(target);
      setRect(node ? node.getBoundingClientRect() : null);
      if (node) node.classList.add("guide-target");
      return node;
    };
    const node = measure();
    const onChange = () => measure();
    window.addEventListener("resize", onChange);
    window.addEventListener("scroll", onChange, true);
    const timer = setInterval(onChange, 250);
    return () => {
      window.removeEventListener("resize", onChange);
      window.removeEventListener("scroll", onChange, true);
      clearInterval(timer);
      node?.classList.remove("guide-target");
    };
  }, [target, index]);
  return rect;
}

export function Guide({ onClose }) {
  const [index, setIndex] = useState(0);
  const step = steps[index];
  const rect = useAnchor(step.target, index);
  const card = useRef(null);
  const [placement, setPlacement] = useState(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight")
        setIndex((i) => Math.min(i + 1, steps.length - 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useLayoutEffect(() => {
    if (!rect || !card.current) return setPlacement(null);
    const box = card.current.getBoundingClientRect(),
      gap = 16;
    const below = rect.bottom + gap + box.height < window.innerHeight - 16;
    const top = below ? rect.bottom + gap : rect.top - gap - box.height;
    const left = Math.min(
      Math.max(16, rect.left + rect.width / 2 - box.width / 2),
      window.innerWidth - box.width - 16,
    );
    setPlacement({ top: Math.max(16, top), left });
  }, [rect, index]);

  const last = index === steps.length - 1;
  return (
    <div className="guide" role="dialog" aria-label="What this map means">
      {rect && (
        <div
          className="guide-ring"
          style={{
            top: rect.top - 4,
            left: rect.left - 4,
            width: rect.width + 8,
            height: rect.height + 8,
          }}
        />
      )}
      <div
        ref={card}
        className={`guide-card ${placement ? "" : "centred"}`}
        style={placement || undefined}
      >
        <p className="guide-count">
          {index + 1} of {steps.length}
        </p>
        <h2>{step.title}</h2>
        <p>{step.body}</p>
        <div className="guide-actions">
          <button className="text-button" onClick={onClose}>
            {last ? "Done" : "Skip"}
          </button>
          <div>
            {index > 0 && (
              <button
                className="secondary"
                onClick={() => setIndex(index - 1)}
              >
                Back
              </button>
            )}
            {!last && (
              <button className="primary" onClick={() => setIndex(index + 1)}>
                Next
              </button>
            )}
            {last && (
              <button className="primary" onClick={onClose}>
                Explore the map
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
