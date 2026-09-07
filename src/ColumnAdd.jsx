import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, Square, Link2, ArrowUpRight, RotateCcw } from "lucide-react";

const choices = [
  { section: "attributes", label: "Attribute", hint: "Information about this object", icon: Square, color: "amber" },
  { section: "relationships", label: "Relationship", hint: "A connection to another object", icon: Link2, color: "blue" },
  { section: "actions", label: "CTA", hint: "Something someone can do", icon: ArrowUpRight, color: "green" },
  { section: "states", label: "State", hint: "A condition in its lifecycle", icon: RotateCcw, color: "purple" },
];

export function ColumnAdd({ name, onChoose }) {
  const [open, setOpen] = useState(false), [position, setPosition] = useState(null);
  const trigger = useRef(), menu = useRef();
  const close = (restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) trigger.current?.focus({ preventScroll: true });
  };
  useLayoutEffect(() => {
    if (!open) return;
    const bounds = trigger.current.getBoundingClientRect();
    const width = 280, height = 236, above = bounds.bottom + height + 12 > window.innerHeight;
    setPosition({
      left: Math.max(12, Math.min(bounds.left, window.innerWidth - width - 12)),
      top: Math.max(12, Math.min(above ? bounds.top - height - 8 : bounds.bottom + 8, window.innerHeight - height - 12)),
      origin: above ? "bottom left" : "top left",
    });
  }, [open]);
  useEffect(() => {
    if (!open || !position) return;
    menu.current?.querySelector('[role="menuitem"]')?.focus({ preventScroll: true });
    const outside = event => {
      if (!menu.current?.contains(event.target) && !trigger.current?.contains(event.target)) close();
    };
    const escape = event => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(true); }
    };
    const wheel = event => { if (!menu.current?.contains(event.target)) close(); };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape, true);
    document.addEventListener("wheel", wheel, { passive: true });
    window.addEventListener("resize", outside);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape, true);
      document.removeEventListener("wheel", wheel);
      window.removeEventListener("resize", outside);
    };
  }, [open, position]);
  const navigate = event => {
    const buttons = [...menu.current.querySelectorAll('[role="menuitem"]')];
    const index = buttons.indexOf(document.activeElement);
    let next;
    if (event.key === "ArrowDown") next = (index + 1) % buttons.length;
    if (event.key === "ArrowUp") next = (index - 1 + buttons.length) % buttons.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = buttons.length - 1;
    if (next !== undefined) { event.preventDefault(); buttons[next].focus(); }
    if (event.key === "Tab") close();
  };
  return <>
    <button ref={trigger} className="column-add" type="button" aria-label={`Add to ${name}`} title={`Add to ${name}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(previous => !previous)}>
      <Plus size={14} />
    </button>
    {open && position && createPortal(
      <div ref={menu} className="object-type-menu" role="menu" aria-label={`Add to ${name}`} style={{ left: position.left, top: position.top, transformOrigin: position.origin }} onKeyDown={navigate}>
        <div className="object-type-menu-label">Add to {name}</div>
        {choices.map(({ section, label, hint, icon: Icon, color }) => <button key={section} type="button" role="menuitem" aria-label={label} onClick={() => { close(); onChoose(section); }}>
          <span className={`type-icon ${color}`}><Icon size={14} /></span>
          <span><strong>{label}</strong><small>{hint}</small></span>
        </button>)}
      </div>, document.body,
    )}
  </>;
}
