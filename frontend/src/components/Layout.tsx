import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useSystemHealth } from "../hooks/useSystemHealth";
import { ToastHost } from "./ui";

const navGroups = [
  {
    label: "Review",
    items: [
      { to: "/", label: "Overview", end: true, icon: "◉" },
      { to: "/analyze", label: "Review a Call", icon: "◎" },
      { to: "/calls", label: "All Calls", icon: "☰" },
    ],
  },
  {
    label: "Coach",
    items: [
      { to: "/knowledge", label: "Coaching Tips", icon: "✦" },
      { to: "/similar-calls", label: "Find Similar", icon: "≈" },
    ],
  },
  {
    label: "Manage",
    items: [
      { to: "/agents", label: "Your Team", icon: "◈" },
      { to: "/jobs", label: "Background Jobs", icon: "◷" },
      { to: "/integrations", label: "Settings", icon: "⚙" },
    ],
  },
];

export default function Layout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const health = useSystemHealth();

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  const closeDrawer = () => setDrawerOpen(false);

  return (
    <div className={`app-shell${drawerOpen ? " drawer-open" : ""}`}>
      <header className="mobile-topbar">
        <button
          type="button"
          className="menu-toggle"
          aria-label={drawerOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>
        <div className="mobile-brand">
          <span className="brand-mark compact">TS</span>
          <strong>Talksmith</strong>
        </div>
      </header>

      {drawerOpen ? (
        <button type="button" className="sidebar-backdrop" aria-label="Close menu" onClick={closeDrawer} />
      ) : null}

      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">TS</div>
          <div>
            <h1>Talksmith</h1>
            <p>Craft better conversations</p>
          </div>
        </div>
        <nav>
          {navGroups.map((group) => (
            <div key={group.label} className="nav-group">
              <span className="nav-group-label">{group.label}</span>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
                  onClick={closeDrawer}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <footer className="sidebar-footer">
          <button
            type="button"
            className="health-footer-btn"
            onClick={health.refresh}
            title={health.detail || health.label}
          >
            <span className={`status-dot ${health.status}`} />
            <span>{health.label}</span>
          </button>
        </footer>
      </aside>
      <main className="content">
        <Outlet />
      </main>
      <ToastHost />
    </div>
  );
}
