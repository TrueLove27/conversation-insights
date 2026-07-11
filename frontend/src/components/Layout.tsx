import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/calls", label: "Calls" },
  { to: "/agents", label: "Agents" },
  { to: "/analyze", label: "Analyze" },
  { to: "/integrations", label: "Integrations" },
  { to: "/jobs", label: "Jobs" },
];

export default function Layout() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">CI</div>
          <div>
            <h1>Conversation Insights</h1>
            <p>Voice Analytics Platform</p>
          </div>
        </div>
        <nav>
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <footer className="sidebar-footer">
          <span className="status-dot" />
          Synthetic demo environment
        </footer>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
