import React from "react";

// Keep content mounted so a reversal continues from the currently rendered height.
// The inner overflow/min-height pair is what lets the grid track reach zero.
export function Reveal({ open, children, className = "", ...props }) {
  return (
    <div
      className={`reveal ${className}`}
      data-open={open ? "true" : "false"}
      aria-hidden={!open}
      inert={!open}
      {...props}
    >
      <div className="reveal-clip">{children}</div>
    </div>
  );
}
