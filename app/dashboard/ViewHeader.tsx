"use client";

// The bar that names the open view. It sits at the top of the content area, spans the
// full width of it, and sticks below the site header while the view scrolls — so the
// student always knows which view they're in and where its one primary action is.
//
// Titles match the rail labels exactly: the vocabulary of the interface is how people
// learn their way around it.

import type { ReactNode } from "react";

export default function ViewHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="dash__bar">
      <div className="dash__bar-inner">
        <div className="dash__bar-text">
          <h1 className="dash__bar-title">{title}</h1>
          {subtitle && <p className="dash__bar-sub">{subtitle}</p>}
        </div>
        {action && <div className="dash__bar-action">{action}</div>}
      </div>
    </header>
  );
}
