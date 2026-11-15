import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { ApiError, GENERIC } from "../api";
import { ErrorAlert } from "../components/Money";

export function Login() {
  const { signIn, notice } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});
    try {
      const user = await signIn(email, password);
      navigate(user.role === "ADMIN" ? "/admin/users" : "/");
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) setFields(err.fields);
      else setError(err instanceof ApiError && err.status === 401 ? err.message : GENERIC);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login">
      <form className="card" onSubmit={submit} noValidate>
        <h1>Sign in to MoneyLog</h1>
        {notice && !error && <p className="notice">{notice}</p>}
        <ErrorAlert message={error} />
        <label htmlFor="email">E-mail</label>
        <input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!fields.email} />
        {fields.email && <p className="field-error">{fields.email}</p>}
        <label htmlFor="password">Password</label>
        <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!fields.password} />
        {fields.password && <p className="field-error">{fields.password}</p>}
        <button type="submit" className="primary" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </main>
  );
}
