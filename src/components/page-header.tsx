import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, action, children }: { eyebrow?: string; title?: string; action?: ReactNode; children?: ReactNode }) {
  return (
    <header className="page-header">
      <div className="page-header-line">
        <div>
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          {title ? <h1 className="page-title">{title}</h1> : null}
        </div>
        {action}
      </div>
      {children}
    </header>
  );
}
