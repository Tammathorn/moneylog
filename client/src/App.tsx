import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth";
import type { Role } from "./api";
import { NotAllowed, Shell } from "./components/Shell";
import { Status } from "./components/Money";
import { Login } from "./pages/Login";
import { Overview } from "./pages/Overview";
import { Accounts } from "./pages/Accounts";
import { Loans } from "./pages/Loans";
import { ChangePassword } from "./pages/ChangePassword";
import { NewTransaction } from "./pages/NewTransaction";
import { History, TransactionDetail } from "./pages/History";
import { AdminUsers } from "./pages/AdminUsers";

// Route guards are convenience only; the API enforces every permission (system SDS section 5).
function For({ role, children }: { role: Role; children: JSX.Element }) {
  const { user } = useAuth();
  return user?.role === role ? children : <NotAllowed />;
}

export function App() {
  const { user, loading } = useAuth();
  if (loading) return <Status>Loading…</Status>;
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={user.role === "ADMIN" ? "/admin/users" : "/"} replace /> : <Login />} />
      <Route element={user ? <Shell /> : <Navigate to="/login" replace />}>
        <Route path="/" element={user?.role === "ADMIN" ? <Navigate to="/admin/users" replace /> : <For role="USER"><Overview /></For>} />
        <Route path="/accounts" element={<For role="USER"><Accounts /></For>} />
        <Route path="/transactions" element={<For role="USER"><History /></For>} />
        <Route path="/transactions/new" element={<For role="USER"><NewTransaction /></For>} />
        <Route path="/transactions/:id" element={<For role="USER"><TransactionDetail /></For>} />
        <Route path="/transactions/:id/edit" element={<For role="USER"><NewTransaction /></For>} />
        <Route path="/loans" element={<For role="USER"><Loans /></For>} />
        <Route path="/account/password" element={user ? <ChangePassword /> : <Navigate to="/login" replace />} />
        <Route path="/admin/users" element={<For role="ADMIN"><AdminUsers /></For>} />
        <Route path="*" element={<p>Page not found.</p>} />
      </Route>
    </Routes>
  );
}
