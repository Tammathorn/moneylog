import { useState, type FormEvent } from "react";
import { api, ApiError, GENERIC } from "../api";
import { ErrorAlert } from "../components/Money";

// F-16 FR-22 (AC-80). The server checks the current password and the 12-128 rule; this page only helps.
export function ChangePassword() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const mismatch = repeat !== "" && repeat !== next;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (mismatch || !current || !next) return;
    setBusy(true);
    setError(null);
    setFields({});
    try {
      await api("/auth/password", { method: "PUT", body: { currentPassword: current, newPassword: next } });
      setDone(true);
      setCurrent(""); setNext(""); setRepeat("");
    } catch (err) {
      if (err instanceof ApiError) { setFields(err.fields); setError(Object.keys(err.fields).length ? null : err.message); }
      else setError(GENERIC);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="narrow">
      <h1>Change password</h1>
      {done && <p className="success" role="status">Your password was changed. Other devices were signed out.</p>}
      <form className="card" onSubmit={submit} noValidate>
        <ErrorAlert message={error} />
        <label htmlFor="current">Current password</label>
        <input id="current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        {fields.currentPassword && <p className="field-error">{fields.currentPassword}</p>}
        <label htmlFor="new">New password</label>
        <input id="new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} aria-describedby="pw-hint" />
        <p id="pw-hint" className="muted small">12 to 128 characters.</p>
        {fields.newPassword && <p className="field-error">{fields.newPassword}</p>}
        <label htmlFor="repeat">Repeat new password</label>
        <input id="repeat" type="password" autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} aria-invalid={mismatch} />
        {mismatch && <p className="field-error">Passwords do not match.</p>}
        <button type="submit" className="primary" disabled={busy || mismatch || !current || !next || repeat !== next}>{busy ? "Saving…" : "Change password"}</button>
      </form>
    </section>
  );
}
