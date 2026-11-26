import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, ApiError, GENERIC, type Account, type AccountType, type Transaction } from "../api";
import { ErrorAlert, Status } from "../components/Money";
import { formatThb, parseThb, todayBangkok, TYPE_LABEL } from "../money";

type Kind = "PAYMENT" | "RECEIPT";
// Mirrors BR-03 / BR-04 so the selects only offer allowed accounts. The API re-checks.
const HEADER: Record<Kind, AccountType[]> = { PAYMENT: ["CASH", "LOAN_TAKEN"], RECEIPT: ["CASH"] };
const LINES: Record<Kind, AccountType[]> = { PAYMENT: ["EXPENSE", "LOAN_TAKEN", "LOAN_GIVEN", "CASH"], RECEIPT: ["INCOME", "LOAN_GIVEN", "LOAN_TAKEN", "CASH"] };
const MAX_LINES = 20;
interface LineState { accountId: string; amount: string; note: string }
const emptyLine = (): LineState => ({ accountId: "", amount: "", note: "" });

const toThb = (satang: number) => (satang / 100).toFixed(2);

// F-05 new transaction; F-10 edit (/transactions/:id/edit); F-12 Duplicate (/transactions/new?from=:id).
export function NewTransaction() {
  const { id: editId } = useParams();
  const [search] = useSearchParams();
  const fromId = search.get("from");
  const navigate = useNavigate();
  const [keep, setKeep] = useState<Set<number>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [kind, setKind] = useState<Kind>("PAYMENT");
  const [accountId, setAccountId] = useState("");
  const [date, setDate] = useState(todayBangkok());
  const [total, setTotal] = useState("");
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<LineState[]>([emptyLine()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Transaction | null>(null);

  useEffect(() => {
    const sourceId = editId ?? fromId;
    Promise.all([
      api<{ accounts: Account[] }>("/accounts"),
      sourceId ? api<{ transaction: Transaction }>(`/transactions/${sourceId}`) : Promise.resolve(null),
    ]).then(([r, src]) => {
      if (src) prefill(src.transaction, r.accounts);
      setAccounts(r.accounts);
    }, (e) => setLoadError(e instanceof ApiError ? e.message : GENERIC));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, fromId]);

  // Fill the form from a saved transaction. Edit keeps the date and may keep archived accounts already on it (AC-53);
  // Duplicate uses today's date and leaves archived accounts empty with a message (AC-65, AC-66, BR-18).
  function prefill(t: Transaction, list: Account[]) {
    const active = new Set(list.filter((a) => a.isActive).map((a) => a.id));
    const archivedNames: string[] = [];
    const pick = (ref: { id: number; name: string }) => {
      if (editId || active.has(ref.id)) return String(ref.id);
      archivedNames.push(ref.name);
      return "";
    };
    setKind(t.kind);
    setAccountId(pick(t.account));
    setDate(editId ? t.date : todayBangkok());
    setTotal(toThb(t.totalSatang));
    setDescription(t.description ?? "");
    setLines(t.lines.map((l) => ({ accountId: pick(l.account), amount: toThb(l.amountSatang), note: l.note ?? "" })));
    if (editId) setKeep(new Set([t.account.id, ...t.lines.map((l) => l.account.id)]));
    if (archivedNames.length) setNotice(archivedNames.map((n) => `${n} is archived — choose another account.`).join(" "));
  }

  const totalSatang = parseThb(total);
  const allocated = lines.reduce((s, l) => s + (parseThb(l.amount) ?? 0), 0);
  const remaining = (totalSatang ?? 0) - allocated;
  const linesValid = lines.every((l) => l.accountId && parseThb(l.amount) !== null && parseThb(l.amount)! > 0);
  const canSave = !busy && !!accountId && totalSatang !== null && totalSatang > 0 && linesValid && remaining === 0;

  const options = useMemo(() => (types: AccountType[], exclude: string[]) =>
    types.map((t) => {
      const list = (accounts ?? []).filter((a) => a.type === t && (a.isActive || keep.has(a.id)) && !exclude.includes(String(a.id)));
      return list.length ? <optgroup key={t} label={TYPE_LABEL[t]}>{list.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</optgroup> : null;
    }), [accounts, keep]);

  function switchKind(k: Kind) {
    setKind(k);
    setAccountId("");
    setLines([emptyLine()]);
    setError(null);
    setFields({});
  }
  const setLine = (i: number, patch: Partial<LineState>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setBusy(true);
    setError(null);
    setFields({});
    try {
      const r = await api<{ transaction: Transaction }>(editId ? `/transactions/${editId}` : "/transactions", {
        method: editId ? "PUT" : "POST",
        body: {
          kind, accountId: Number(accountId), date, totalSatang, description: description || undefined,
          lines: lines.map((l) => ({ accountId: Number(l.accountId), amountSatang: parseThb(l.amount), note: l.note || undefined })),
        },
      });
      if (editId) navigate(`/transactions/${editId}`, { state: { transaction: r.transaction } });
      else setSaved(r.transaction);
    } catch (err) {
      if (err instanceof ApiError) {
        setFields(err.fields);
        setError(err.status === 400 ? "Please correct the highlighted fields." : err.message);
      } else setError(GENERIC);
    } finally {
      setBusy(false);
    }
  }

  if (saved) {
    return (
      <section className="card">
        <h1>Transaction saved</h1>
        <p>{saved.kind === "PAYMENT" ? "Payment" : "Money received"} of <strong>{formatThb(saved.totalSatang)}</strong> on {saved.date}.</p>
        <p className="row">
          <Link className="button" to={`/transactions/${saved.id}`}>View transaction</Link>
          <button type="button" className="primary" onClick={() => { setSaved(null); setTotal(""); setDescription(""); setLines([emptyLine()]); }}>Record another</button>
        </p>
      </section>
    );
  }

  return (
    <section>
      <h1>{editId ? "Edit transaction" : "New transaction"}</h1>
      <ErrorAlert message={loadError} />
      {notice && <p className="notice" role="status">{notice}</p>}
      {!accounts && !loadError && <Status>Loading…</Status>}
      {accounts && (
        <form className="card tx-form" onSubmit={submit} noValidate>
          <div className="toggle" role="group" aria-label="Transaction type">
            <button type="button" aria-pressed={kind === "PAYMENT"} onClick={() => switchKind("PAYMENT")}>Payment / charge</button>
            <button type="button" aria-pressed={kind === "RECEIPT"} onClick={() => switchKind("RECEIPT")}>Money received</button>
          </div>
          <ErrorAlert message={error} />
          <div className="grid">
            <div>
              <label htmlFor="account">{kind === "PAYMENT" ? "Paid from" : "Received into"} *</label>
              <select id="account" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                <option value="">Choose an account</option>
                {options(HEADER[kind], [])}
              </select>
              {fields.accountId && <p className="field-error">{fields.accountId}</p>}
            </div>
            <div>
              <label htmlFor="date">Date *</label>
              <input id="date" type="date" value={date} max={todayBangkok()} onChange={(e) => setDate(e.target.value)} />
              {fields.date && <p className="field-error">{fields.date}</p>}
            </div>
            <div>
              <label htmlFor="total">Total (THB) *</label>
              <input id="total" inputMode="decimal" placeholder="0.00" value={total} onChange={(e) => setTotal(e.target.value)} aria-invalid={total !== "" && totalSatang === null} />
              {fields.totalSatang && <p className="field-error">{fields.totalSatang}</p>}
            </div>
            <div>
              <label htmlFor="description">Description</label>
              <input id="description" maxLength={200} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>

          <h2>Allocation lines</h2>
          {fields.lines && <p className="field-error">{fields.lines}</p>}
          {lines.map((l, i) => (
            <div className="line" key={i}>
              <label>Line {i + 1} account
                <select aria-label={`Line ${i + 1} account`} value={l.accountId} onChange={(e) => setLine(i, { accountId: e.target.value })}>
                  <option value="">Choose</option>
                  {options(LINES[kind], [accountId])}
                </select>
              </label>
              <label>Amount
                <input aria-label={`Line ${i + 1} amount`} inputMode="decimal" placeholder="0.00" value={l.amount} onChange={(e) => setLine(i, { amount: e.target.value })} />
              </label>
              <label>Note
                <input aria-label={`Line ${i + 1} note`} maxLength={100} value={l.note} onChange={(e) => setLine(i, { note: e.target.value })} />
              </label>
              {lines.length > 1 && <button type="button" className="link" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}>Remove line</button>}
            </div>
          ))}
          <button type="button" disabled={lines.length >= MAX_LINES} onClick={() => setLines((ls) => [...ls, emptyLine()])}>Add line</button>

          <p className="allocation" aria-live="polite">
            Allocated <strong data-testid="allocated">{formatThb(allocated)}</strong> · Remaining{" "}
            <strong data-testid="remaining" className={remaining !== 0 ? "negative" : ""}>{formatThb(remaining)}</strong>
          </p>
          <button type="submit" className="primary" disabled={!canSave}>{busy ? "Saving…" : editId ? "Save changes" : "Save transaction"}</button>
        </form>
      )}
    </section>
  );
}
