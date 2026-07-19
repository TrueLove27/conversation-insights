import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {action ? <div className="header-actions">{action}</div> : null}
    </header>
  );
}

export function Card({
  children,
  className = "",
  title,
  description,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
}) {
  return (
    <section className={`panel card ${className}`}>
      {title ? <h3>{title}</h3> : null}
      {description ? <p className="panel-desc">{description}</p> : null}
      {children}
    </section>
  );
}

export function Badge({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info";
}) {
  return <span className={`badge badge-${variant}`}>{children}</span>;
}

export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">◇</div>
      <h4>{title}</h4>
      <p>{message}</p>
    </div>
  );
}

export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="skeleton-wrap">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-line" />
      ))}
    </div>
  );
}

export function SourceCard({
  title,
  text,
  score,
  tag,
  generator,
  to,
}: {
  title?: string;
  text: string;
  score?: number;
  tag?: string;
  generator?: string;
  to?: string;
}) {
  return (
    <div className="source-card enhanced">
      <div className="source-card-head">
        {title ? <strong>{title}</strong> : null}
        <div className="source-card-meta">
          {tag ? <Badge variant="info">{tag}</Badge> : null}
          {score !== undefined ? (
            <Badge variant={score > 0.6 ? "success" : "default"}>
              {Math.round(score * 100)}% match
            </Badge>
          ) : null}
          {generator ? <Badge variant="default">{generator}</Badge> : null}
        </div>
      </div>
      <p>{text}</p>
      {score !== undefined ? (
        <div className="relevance-bar">
          <div className="relevance-fill" style={{ width: `${Math.round(score * 100)}%` }} />
        </div>
      ) : null}
      {to ? (
        <Link className="inline-link source-open-link" to={to}>
          Open full call →
        </Link>
      ) : null}
    </div>
  );
}

export function AlertBanner({
  variant,
  title,
  message,
}: {
  variant: "danger" | "warning" | "info";
  title: string;
  message: string;
}) {
  return (
    <div className={`alert-banner alert-${variant}`}>
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  );
}

export function Button({
  children,
  variant = "glow",
  className = "",
  type = "button",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "glow" | "glass" | "trace";
}) {
  const variantClass =
    variant === "glass" ? "secondary" : variant === "trace" ? "btn-trace" : "";
  return (
    <button type={type} className={`${variantClass} ${className}`.trim()} {...rest}>
      {children}
    </button>
  );
}

export function CopyButton({
  text,
  label = "Copy",
  className = "",
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const value = text.trim();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.dispatchEvent(new CustomEvent("talksmith:toast", { detail: "Copied!" }));
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.dispatchEvent(new CustomEvent("talksmith:toast", { detail: "Copy failed" }));
    }
  };

  return (
    <Button
      type="button"
      variant="glass"
      className={`copy-btn ${className}`.trim()}
      onClick={handleCopy}
      disabled={!text.trim()}
    >
      {copied ? "Copied!" : label}
    </Button>
  );
}

export function ToastHost() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let timer: number | undefined;
    const onToast = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      setMessage(detail);
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => setMessage(null), 2200);
    };
    window.addEventListener("talksmith:toast", onToast);
    return () => {
      window.removeEventListener("talksmith:toast", onToast);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  if (!message) return null;
  return (
    <div className="toast" role="status" aria-live="polite">
      {message}
    </div>
  );
}

export function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button type="button" className={`chip ${active ? "chip-active" : ""}`} onClick={onClick}>
      {label}
    </button>
  );
}

export function MetricCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: string;
}) {
  return (
    <article className="metric-card enhanced">
      {icon ? <span className="metric-icon">{icon}</span> : null}
      <span className="metric-label">{label}</span>
      <strong className="metric-value">{value}</strong>
      {hint ? <span className="metric-hint">{hint}</span> : null}
    </article>
  );
}

export function ServiceStatus({
  name,
  status,
  detail,
}: {
  name: string;
  status: "connected" | "offline" | "optional";
  detail?: string;
}) {
  return (
    <div className={`service-card service-${status}`}>
      <div className="service-dot" />
      <div>
        <strong>{name}</strong>
        <p>{detail || status}</p>
      </div>
    </div>
  );
}
