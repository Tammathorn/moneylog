import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { Footer } from "./Footer";

export function Shell() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  const links = user.role === "USER"
    ? [["/", "Overview"], ["/accounts", "Accounts"], ["/transactions/new", "New transaction"], ["/transactions", "History"]]
    : [["/admin/users", "Users"]];
  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">MoneyLog</span>
        <nav aria-label="Main">
          {links.map(([to, label]) => <NavLink key={to} to={to} end>{label}</NavLink>)}
        </nav>
        <div className="who">
          <span data-testid="current-user">{user.displayName}</span>
          <span className="role">{user.role === "ADMIN" ? "Administrator" : "User"}</span>
          <button type="button" className="link" onClick={async () => { await signOut(); navigate("/login"); }}>Sign out</button>
        </div>
      </header>
      <main className="content"><Outlet /></main>
      <Footer />
    </div>
  );
}

export function NotAllowed() {
  return (
    <section>
      <h1>Not available</h1>
      <p>This page is not available for your role.</p>
    </section>
  );
}
