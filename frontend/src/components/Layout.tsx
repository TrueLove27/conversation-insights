import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/", label: "Overview", end: true, hint: "How your team is doing" },
  { to: "/calls", label: "All Calls", hint: "Listen & read transcripts" },
  { to: "/agents", label: "Your Team", hint: "See who's performing well" },
  { to: "/analyze", label: "Review a Call", hint: "Check one conversation" },
  { to: "/knowledge", label: "Coaching Tips", hint: "What to say in tough moments" },
  { to: "/similar-calls", label: "Find Similar", hint: "See how others handled it" },
  { to: "/integrations", label: "Settings", hint: "Connections & data" },
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
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
              title={item.hint}
            >
              <span>{item.label}</span>
            </NavLink>
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
