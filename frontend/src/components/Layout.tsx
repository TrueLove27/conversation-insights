import { NavLink, Outlet } from "react-router-dom";

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
      { to: "/integrations", label: "Settings", icon: "⚙" },
    ],
  },
];

export default function Layout() {
  return (
    <div className="app-shell">
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
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <footer className="sidebar-footer">
          <span className="status-dot" />
          Talksmith is ready
        </footer>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
