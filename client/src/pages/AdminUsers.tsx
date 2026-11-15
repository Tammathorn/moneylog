import { useEffect, useState } from "react";
import { api, ApiError, GENERIC, type AdminUser } from "../api";
import { useAuth } from "../auth";
import { ErrorAlert, Status } from "../components/Money";

export function AdminUsers() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    api<{ users: AdminUser[] }>("/admin/users").then((r) => setUsers(r.users), (e) => setError(e instanceof ApiError ? e.message : GENERIC));
  }, []);

  async function toggle(u: AdminUser) {
    setBusyId(u.id);
    setError(null);
    try {
      const r = await api<{ user: AdminUser }>(`/admin/users/${u.id}`, { method: "PATCH", body: { isActive: !u.isActive } });
      setUsers((list) => list?.map((x) => (x.id === u.id ? r.user : x)) ?? null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : GENERIC);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section>
      <h1>Users</h1>
      <p className="muted">Administrators control who can sign in. Financial records are private to each user.</p>
      <ErrorAlert message={error} />
      {!users && !error && <Status>Loading…</Status>}
      {users && (
        <div className="card">
          <table aria-label="Users">
            <thead><tr><th>E-mail</th><th>Name</th><th>Role</th><th>Status</th><th /></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>{u.displayName}</td>
                  <td>{u.role === "ADMIN" ? "Administrator" : "User"}</td>
                  <td><span className={`badge ${u.isActive ? "on" : "off"}`} data-testid={`status-${u.email}`}>{u.isActive ? "Enabled" : "Disabled"}</span></td>
                  <td className="actions">
                    {u.id === me?.id ? <span className="muted">You</span> : (
                      <button type="button" disabled={busyId === u.id} onClick={() => toggle(u)} aria-label={`${u.isActive ? "Disable" : "Enable"} ${u.email}`}>
                        {busyId === u.id ? "Saving…" : u.isActive ? "Disable" : "Enable"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
