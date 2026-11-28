import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError, GENERIC, type Account, type AccountType } from "../api";
import { ErrorAlert, Money, Status } from "../components/Money";
import { parseSignedThb, parseThb, todayBangkok, TYPE_LABEL } from "../money";

const ORDER = ["CASH", "LOAN_TAKEN", "LOAN_GIVEN", "INCOME", "EXPENSE"] as const;
// Mirrors F-09 §3 step 4 so the form only offers valid subtypes. The API re-checks.
const SUBTYPES: Record<AccountType, { value: string; label: string }[]> = {
  CASH: [{ value: "BANK", label: "Bank" }, { value: "WALLET", label: "Wallet" }],
  LOAN_TAKEN: [{ value: "CREDIT_CARD", label: "Credit card" }, { value: "PERSONAL", label: "Personal" }, { value: "OTHER", label: "Other" }],
  LOAN_GIVEN: [{ value: "PERSONAL", label: "Personal" }, { value: "OTHER", label: "Other" }],
  INCOME: [], EXPENSE: [],
};
const errorText = (err: unknown) => (err instanceof ApiError ? Object.values(err.fields)[0] ?? err.message : GENERIC);

export function Accounts() {
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [renaming, setRenaming] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api<{ accounts: Account[] }>("/accounts").then((r) => setAccounts(r.accounts), (e) => setError(e instanceof ApiError ? e.message : GENERIC));
  }, []);

  const replace = (a: Account) => setAccounts((list) => list?.map((x) => (x.id === a.id ? { ...x, ...a } : x)) ?? null);

  async function patch(a: Account, body: object) {
    setError(null);
    try {
      const r = await api<{ account: Account }>(`/accounts/${a.id}`, { method: "PATCH", body });
      replace(r.account);
      return true;
    } catch (err) {
      setError(errorText(err));
      return false;
    }
  }

  async function remove(a: Account) {
    setError(null);
    try {
      await api(`/accounts/${a.id}`, { method: "DELETE" });
      setAccounts((list) => list?.filter((x) => x.id !== a.id) ?? null);
    } catch (err) {
      setError(errorText(err));
    }
  }

  const active = accounts?.filter((a) => a.isActive) ?? [];
  const archived = accounts?.filter((a) => !a.isActive) ?? [];

  return (
    <section>
      <div className="page-head">
        <h1>Accounts</h1>
        {!creating && <button type="button" className="primary" onClick={() => setCreating(true)}>New account</button>}
      </div>
      <ErrorAlert message={error} />
      {creating && <NewAccountForm onSaved={(a) => { setAccounts((l) => [...(l ?? []), a]); setCreating(false); }} onCancel={() => setCreating(false)} />}
      {!accounts && !error && <Status>Loading…</Status>}
      {accounts?.length === 0 && <p className="muted">No accounts yet.</p>}
      {accounts && ORDER.map((type) => {
        const list = active.filter((a) => a.type === type);
        if (!list.length) return null;
        return (
          <div className="card" key={type}>
            <h2>{TYPE_LABEL[type]}</h2>
            <table>
              <tbody>
                {list.map((a) => (
                  <tr key={a.id}>
                    <td>
                      {renaming === a.id
                        ? <RenameForm account={a} onDone={async (name) => { if (name === null || await patch(a, { name })) setRenaming(null); }} />
                        : a.name}
                      {a.openingDate && <div className="muted small">Opening <Money satang={a.openingBalanceSatang} /> on {a.openingDate}</div>}
                      {editing === a.id && <OpeningForm account={a} onSaved={(x) => { replace(x); setEditing(null); }} onCancel={() => setEditing(null)} />}
                    </td>
                    <td className="num" data-testid={`balance-${a.name}`}><Money satang={a.balanceSatang} flagNegative={type === "CASH"} /></td>
                    <td className="actions">
                      {type !== "INCOME" && type !== "EXPENSE" && editing !== a.id && (
                        <button type="button" className="link" onClick={() => setEditing(a.id)} aria-label={`Set opening balance for ${a.name}`}>Set opening balance</button>
                      )}
                      {renaming !== a.id && <button type="button" className="link" onClick={() => setRenaming(a.id)} aria-label={`Rename ${a.name}`}>Rename</button>}
                      <button type="button" className="link" onClick={() => patch(a, { isActive: false })} aria-label={`Archive ${a.name}`}>Archive</button>
                      {a.inUse === false && <button type="button" className="link danger" onClick={() => remove(a)} aria-label={`Delete ${a.name}`}>Delete</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
      {archived.length > 0 && (
        <section className="card" aria-label="Archived accounts">
          <h2>Archived</h2>
          <p className="muted small">Archived accounts keep their history and still count in balances, but cannot be used in new transactions.</p>
          <table>
            <tbody>
              {archived.map((a) => (
                <tr key={a.id}>
                  <td>{a.name} <span className="muted small">{TYPE_LABEL[a.type]}</span></td>
                  <td className="num" data-testid={`balance-${a.name}`}><Money satang={a.balanceSatang} /></td>
                  <td className="actions">
                    <button type="button" className="link" onClick={() => patch(a, { isActive: true })} aria-label={`Restore ${a.name}`}>Restore</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </section>
  );
}

function NewAccountForm({ onSaved, onCancel }: { onSaved: (a: Account) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("CASH");
  const [subtype, setSubtype] = useState("BANK");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function changeType(t: AccountType) {
    setType(t);
    setSubtype(SUBTYPES[t][0]?.value ?? "");
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = SUBTYPES[type].length ? { name, type, subtype } : { name, type };
      const r = await api<{ account: Account }>("/accounts", { method: "POST", body });
      onSaved(r.account);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card inline-form" onSubmit={submit} aria-label="New account">
      <label>Name <input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} aria-label="Account name" required /></label>
      <label>Type
        <select value={type} onChange={(e) => changeType(e.target.value as AccountType)} aria-label="Account type">
          {ORDER.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
        </select>
      </label>
      {SUBTYPES[type].length > 0 && (
        <label>Subtype
          <select value={subtype} onChange={(e) => setSubtype(e.target.value)} aria-label="Subtype">
            {SUBTYPES[type].map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
      )}
      <button type="submit" className="primary" disabled={busy}>{busy ? "Saving…" : "Create account"}</button>
      <button type="button" className="link" onClick={onCancel}>Cancel</button>
      {error && <p className="field-error" role="alert">{error}</p>}
    </form>
  );
}

function RenameForm({ account, onDone }: { account: Account; onDone: (name: string | null) => void }) {
  const [name, setName] = useState(account.name);
  return (
    <form className="inline-form" onSubmit={(e) => { e.preventDefault(); onDone(name); }}>
      <label>New name <input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} aria-label={`New name for ${account.name}`} /></label>
      <button type="submit" className="primary">Save name</button>
      <button type="button" className="link" onClick={() => onDone(null)}>Cancel</button>
    </form>
  );
}

function OpeningForm({ account, onSaved, onCancel }: { account: Account; onSaved: (a: Account) => void; onCancel: () => void }) {
  const [amount, setAmount] = useState(account.openingDate ? (account.openingBalanceSatang / 100).toFixed(2) : "");
  const [date, setDate] = useState(account.openingDate ?? todayBangkok());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const satang = account.type === "CASH" ? parseSignedThb(amount) : parseThb(amount);
    if (satang === null) return setError("Enter an amount like 1500 or 1500.50.");
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ account: Account }>(`/accounts/${account.id}/opening-balance`, { method: "PUT", body: { openingBalanceSatang: satang, openingDate: date } });
      onSaved(r.account);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="inline-form" onSubmit={submit}>
      <label>Opening amount (THB) <input inputMode={account.type === "CASH" ? "text" : "decimal"} value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Opening amount" /></label>
      <label>Opening date <input type="date" value={date} max={todayBangkok()} onChange={(e) => setDate(e.target.value)} aria-label="Opening date" /></label>
      <button type="submit" className="primary" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
      <button type="button" className="link" onClick={onCancel}>Cancel</button>
      {error && <p className="field-error" role="alert">{error}</p>}
    </form>
  );
}
