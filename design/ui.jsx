/* ===========================================================================
   ui.jsx — 공유 UI 프리미티브 + 아이콘 세트 (window 로 export)
   =========================================================================== */
const { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } = React;

/* ---------- Icon ---------- */
const ICON_D = {
  doc: ["M4 1.75h5L13 5.5v8.75a.75.75 0 0 1-.75.75h-8.5a.75.75 0 0 1-.75-.75V2.5a.75.75 0 0 1 .75-.75Z", "M9 1.75V5.5H13"],
  plus: ["M8 3.5v9", "M3.5 8h9"],
  x: ["M4 4l8 8", "M12 4l-8 8"],
  copy: ["M5.75 5.75h7.5v7.5h-7.5z", "M3.25 10.25h-.5v-7.5h7.5v.5"],
  check: ["M3 8.4l3.3 3.3L13 5"],
  chevronDown: ["M4 6l4 4 4-4"],
  chevronRight: ["M6 4l4 4-4 4"],
  comment: ["M2.5 3.5h11v7H7l-3 2.5V10.5H2.5z"],
  reply: ["M6 4L2.5 7.5 6 11", "M2.5 7.5H10a3.5 3.5 0 0 1 3.5 3.5v1.5"],
  sun: ["M8 5.2A2.8 2.8 0 1 0 8 10.8 2.8 2.8 0 0 0 8 5.2Z", "M8 1v1.6M8 13.4V15M1 8h1.6M13.4 8H15M3.1 3.1l1.1 1.1M11.8 11.8l1.1 1.1M12.9 3.1l-1.1 1.1M4.2 11.8l-1.1 1.1"],
  moon: ["M13.4 9.6A5.5 5.5 0 0 1 6.4 2.6 5.5 5.5 0 1 0 13.4 9.6Z"],
  sliders: ["M3 5h6.5M12.5 5H13M3 11h.5M6.5 11H13", "M11 3.4A1.6 1.6 0 1 0 11 6.6 1.6 1.6 0 0 0 11 3.4ZM5 9.4A1.6 1.6 0 1 0 5 12.6 1.6 1.6 0 0 0 5 9.4Z"],
  arrowRight: ["M3 8h9", "M9 5l3 3-3 3"],
  handoff: ["M2.5 8h8", "M8 5l3 3-3 3", "M13.5 3.2v9.6"],
  sparkle: ["M8 2l1.4 3.6L13 7l-3.6 1.4L8 12l-1.4-3.6L3 7l3.6-1.4Z"],
  plug: ["M6 2.2v2.8M10 2.2v2.8", "M4.6 5h6.8v2a3.4 3.4 0 0 1-6.8 0Z", "M8 10.4V14"],
  cloud: ["M4.6 12a2.5 2.5 0 0 1-.3-4.97A3.5 3.5 0 0 1 11 6.6 2.7 2.7 0 0 1 11 12Z"],
  search: ["M10.2 7.1A3.1 3.1 0 1 0 4 7.1a3.1 3.1 0 0 0 6.2 0Z", "M9.4 9.4l3.3 3.3"],
  trash: ["M3 4.5h10", "M6 4.5V3.2A.7.7 0 0 1 6.7 2.5h2.6a.7.7 0 0 1 .7.7V4.5", "M4.5 4.5l.6 9a.8.8 0 0 0 .8.75h4.2a.8.8 0 0 0 .8-.75l.6-9"],
  menu: ["M2.5 4.5h11M2.5 8h11M2.5 11.5h11"],
  history: ["M8 4v4l2.5 1.5", "M2.5 8a5.5 5.5 0 1 0 1.7-4M3 2.5V6h3.5"],
  link: ["M6.5 9.5l3-3", "M7 4.5l1-1a2.5 2.5 0 0 1 3.5 3.5l-1 1", "M9 11.5l-1 1a2.5 2.5 0 0 1-3.5-3.5l1-1"],
};

function Icon({ name, size = 16, className = "", style = {} }) {
  const d = ICON_D[name] || [];
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
      stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
      className={className} style={{ flexShrink: 0, ...style }} aria-hidden="true">
      {d.map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
}

/* ---------- Button ---------- */
function Button({ variant = "default", size = "md", icon, children, className = "", ...rest }) {
  return (
    <button className={`btn btn--${variant} btn--${size} ${className}`} {...rest}>
      {icon && <Icon name={icon} size={size === "sm" ? 14 : 16} />}
      {children && <span>{children}</span>}
    </button>
  );
}

/* ---------- IconButton ---------- */
function IconButton({ icon, label, active, className = "", size = 16, ...rest }) {
  return (
    <button className={`icon-btn ${active ? "is-active" : ""} ${className}`}
      aria-label={label} title={label} {...rest}>
      <Icon name={icon} size={size} />
    </button>
  );
}

/* ---------- Badge / Pill ---------- */
function Badge({ tone = "neutral", children }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}

/* ---------- Segmented ---------- */
function Segmented({ options, value, onChange, size = "md" }) {
  return (
    <div className={`segmented segmented--${size}`} role="tablist">
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value}
          className={`segmented__opt ${value === o.value ? "is-active" : ""}`}
          onClick={() => onChange(o.value)}>
          {o.icon && <Icon name={o.icon} size={14} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Tooltip-ish kbd ---------- */
function Kbd({ children }) { return <kbd className="kbd">{children}</kbd>; }

/* ---------- Toast ---------- */
function useToast() {
  const [toast, setToast] = useState(null);
  const show = useCallback((msg) => {
    setToast(msg);
    clearTimeout(show._t);
    show._t = setTimeout(() => setToast(null), 2200);
  }, []);
  const node = toast ? (
    <div className="toast" role="status">
      <Icon name="check" size={15} />{toast}
    </div>
  ) : null;
  return [node, show];
}

Object.assign(window, {
  Icon, Button, IconButton, Badge, Segmented, Kbd, useToast,
  R: React,
});
