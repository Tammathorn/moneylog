#!/usr/bin/env python3
"""Builds the Deliverable 1 PDF from the repo's docs. Two passes: the second fills page numbers.
Usage: python3 docs/report/build_report.py <out.pdf> [repo_url] [release_ref]"""
import json, re, subprocess, sys, html
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
D = ROOT / "docs"; S1 = D / "sprints" / "sprint-1"; EV = S1 / "evidence"; SH = EV / "screenshots"
OUT = Path(sys.argv[1]); REPO = sys.argv[2] if len(sys.argv) > 2 else "https://github.com/Tammathorn/moneylog"
REL = sys.argv[3] if len(sys.argv) > 3 else "v0.1.0"
git = lambda *a: subprocess.check_output(["git", "-C", str(ROOT), *a], text=True).strip()
COMMIT = git("rev-parse", "--short", "HEAD")

def md(text, shift=1):
    return subprocess.run(["pandoc", "-f", "gfm", "-t", "html", f"--shift-heading-level-by={shift}"],
                          input=text, capture_output=True, text=True, check=True).stdout

def doc(path, shift=1):
    t = Path(path).read_text()
    t = t.replace("](diagrams/", f"]({D}/diagrams/")
    return md(t, shift)

def pre(text): return f"<pre>{html.escape(text)}</pre>"

def excerpt(path, start_pat, end_pat):
    lines = Path(path).read_text().splitlines()
    s = next(i for i, l in enumerate(lines) if re.search(start_pat, l))
    e = next(i for i in range(s + 1, len(lines)) if re.search(end_pat, lines[i]))
    return "\n".join(lines[s:e + 1])

def shot(name, caption):
    return f'<figure><img src="{SH / name}"><figcaption>{html.escape(caption)}</figcaption></figure>'

parts = []  # (id, title, html)

# ---------------- Part A-D
parts.append(("A", "Part A — SRS and product scope", doc(D / "srs.md")))
parts.append(("B", "Part B — Feature inventory and traceability", doc(D / "features.md") + doc(D / "traceability.md")))
parts.append(("C", "Part C — System-Level SDS", doc(D / "system-sds.md")))
parts.append(("D", "Part D — Three-sprint plan", doc(D / "sprints" / "plan.md")))
# ---------------- Part E
e_html = "".join(doc(S1 / f) for f in ["F-01-F-02-auth-access.md", "F-03-F-04-accounts.md", "F-05-F-06-transactions.md", "F-07-F-08-summary-admin.md", "sts.md", "definition-of-done.md"])
contract_hist = git("log", "--format=%h|%ad|%s", "--date=format:%Y-%m-%d %H:%M", "--", "docs/sprints/sprint-1/F-01-F-02-auth-access.md", "docs/sprints/sprint-1/F-03-F-04-accounts.md", "docs/sprints/sprint-1/F-05-F-06-transactions.md", "docs/sprints/sprint-1/F-07-F-08-summary-admin.md", "docs/sprints/sprint-1/sts.md")
rows = "".join(f"<tr><td><code>{h}</code></td><td>{d}</td><td>{html.escape(s)}</td></tr>" for h, d, s in (l.split("|", 2) for l in contract_hist.splitlines()))
e_html += f"<h2>Contract and STS version history (from Git)</h2><table><thead><tr><th>Commit</th><th>Date</th><th>Message</th></tr></thead><tbody>{rows}</tbody></table>"
parts.append(("E", "Part E — Sprint 1 engineering contracts", e_html))

# ---------------- Part F
f = []
f.append("""<h2>F.1 Setup summary</h2>
<p>PostgreSQL 16 → <code>cp server/.env.example server/.env</code> (set <code>SEED_DEMO_PASSWORD</code>) →
<code>npm install</code> in <code>server/</code>, <code>client/</code> and the root → <code>cd server &amp;&amp; npx prisma migrate deploy &amp;&amp; npm run db:seed</code> →
<code>npm run dev --prefix server</code> (API :3000) and <code>npm run dev --prefix client</code> (UI :5173).
Seeded synthetic accounts: <code>admin@</code>, <code>alice@</code>, <code>bob@</code>, <code>dave@moneylog.test</code> (dave disabled); the password is the local
<code>SEED_DEMO_PASSWORD</code> and is not stored in Git or in this report. Full instructions: README.</p>""")
f.append(f"<h2>F.2 Program demonstrations</h2><p>All screenshots were captured by the Playwright E2E run (<code>e2e/*.spec.ts</code>) against the real UI, API and a freshly migrated and seeded PostgreSQL database, at commit <code>{COMMIT}</code>. Exception: none.</p>")
scen = [
 ("Scenario 1 — Complete normal journey and retrieval", "F-01, F-03 – F-07 · AC-08, AC-18, AC-21 – AC-24, AC-35 · TEST-50", "User (alice)", "Seeded; no transactions; KBank opening 0",
  "Sign in → set the KBank opening balance to 10,000.00 → record salary 25,000.00 received → record a card purchase of 1,850.00 split Dining 650 / Groceries 1,200 → repay 1,000.00 to the card from KBank → open Overview → reload the page → Accounts → History → Detail.",
  "Cash 34,000.00 · card debt 850.00 · income 25,000.00 · expenses 1,850.00 · net 23,150.00 · Groceries > Dining · 3 history rows · values unchanged after the reload.",
  "As expected (E2E assertions passed; screenshots below).",
  [("01-sign-in.png", "Sign-in page"), ("03-card-purchase-split.png", "Card purchase split across two expense lines, Remaining ฿0.00"),
   ("04-overview-after-journey.png", "Overview after the journey (AC-35 figures)"), ("05-accounts-after-journey.png", "Accounts after a page reload: balances retrieved from the DB"),
   ("06-history.png", "History, newest first"), ("07-transaction-detail.png", "Saved transaction detail with its allocation lines")]),
 ("Scenario 2 — Business-rule rejection (allocation mismatch)", "F-05 · AC-25, AC-31 · BR-01 · TEST-51 (also TEST-28, TEST-29)", "User (bob)", "Seeded; no transactions",
  "New transaction → pay from the card with total 1,850.00 → lines 650.00 + 1,199.99 → then POST the same payload straight to the API, bypassing the UI.",
  "Save disabled with Remaining ฿0.01. The API returns 422 ALLOCATION_MISMATCH and the history stays empty.",
  "As expected: 422 ALLOCATION_MISMATCH, total = 0.", [("08-rule-mismatch-ui.png", "Save is disabled while ฿0.01 is unallocated")]),
 ("Scenario 3 — Sign-in rejection, admin role, forbidden operation, sign-out", "F-01, F-02, F-08 · AC-02, AC-05, AC-10, AC-38 · TEST-09, TEST-52, TEST-50", "Disabled user (dave); Administrator", "Seeded; dave disabled",
  "dave signs in → admin signs in → Users page → admin opens /accounts → admin's browser calls /api/summary, /api/accounts and /api/transactions. Sign-out is shown at the end of Scenario 1.",
  "dave gets 'E-mail or password is incorrect.'; the admin sees users only; the page shows 'not available'; the API returns 403 FORBIDDEN_ROLE ×3; after sign-out /api/auth/me returns 401.",
  "As expected. Backend proof that does not depend on the UI: TEST-11/12/13 in F.4.",
  [("02-sign-in-rejected.png", "Disabled user's sign-in is refused (same message as a wrong password)"), ("09-admin-users.png", "Administrator Users page: identity fields only"),
   ("10-admin-forbidden-page.png", "Admin opening a financial page. The API also refuses with 403 (TEST-12, TEST-52).")]),
]
for title, ids, role, start, steps, exp, act, shots in scen:
    f.append(f"<h3>{title}</h3><table class='kv'><tr><th>Feature / AC</th><td>{ids}</td></tr><tr><th>Role</th><td>{role}</td></tr><tr><th>Start</th><td>{start}</td></tr><tr><th>Steps</th><td>{html.escape(steps)}</td></tr><tr><th>Expected</th><td>{html.escape(exp)}</td></tr><tr><th>Actual</th><td>{html.escape(act)}</td></tr></table>")
    f.append("<div class='shots'>" + "".join(shot(n, c) for n, c in shots) + "</div>")

run = (EV / "release-run.txt").read_text()
f.append("<h2>F.3 Build and automated test results</h2><p>Command: <code>bash scripts/verify-release.sh</code> (runs the builds, then the server, client and E2E suites). Output: <code>evidence/release-run.txt</code>.</p>" + pre(run))
tr = (S1 / "test-results.md").read_text()
tr = tr.split("\n", 1)[1]
f.append(md(tr.replace("# ", "## ", 0), 1).replace("<h2", "<h3").replace("</h2>", "</h3>"))

f.append("<h2>F.4 Test excerpts with execution results</h2><h3>Domain rule — allocation must equal the total (BR-01, TEST-28/29)</h3>")
f.append(pre(excerpt(ROOT / "server/tests/unit/transaction-rules.test.ts", r"TEST-28 allocation", r"^\}\);")))
f.append(pre(excerpt(ROOT / "server/tests/api/transactions.api.test.ts", r"TEST-29 rejects", r"^  \}\);")))
f.append("<h3>Role / ownership restriction (BR-20, BR-06, TEST-12/35)</h3>")
f.append(pre(excerpt(ROOT / "server/tests/api/access.api.test.ts", r"TEST-12 an administrator", r"^\}\);")))
f.append(pre(excerpt(ROOT / "server/tests/api/transactions.api.test.ts", r"TEST-35 another user", r"^  \}\);")))
res = [l for l in run.splitlines() if re.search(r"(TEST-(12|28|29|35))", l)]
f.append("<p>Execution result for these tests (from the verbose run of the same commit):</p>")
verbose = subprocess.run(["npx", "vitest", "run", "--reporter=verbose", "tests/unit/transaction-rules.test.ts", "tests/api/access.api.test.ts", "tests/api/transactions.api.test.ts"], cwd=ROOT / "server", capture_output=True, text=True).stdout
f.append(pre("\n".join(l for l in verbose.splitlines() if re.search(r"TEST-(12|28|29|35)|Test Files|Tests ", l))))
f.append("<h3>TDD: red before, green after</h3>")
for name, label in [("tdd-transactions-red.txt", "RED — commit eb7c6ea (rules skeleton): TEST-28/30/32 fail on assertions"),
                    ("tdd-transactions-green.txt", "GREEN — commit 2aaad2a (rules implemented)"),
                    ("tdd-summary-red.txt", "RED — commit 1a2a76c (summary skeleton): TEST-41/43"),
                    ("tdd-summary-green.txt", "GREEN — commit 7c8627f (summary implemented)")]:
    t = (EV / name).read_text().splitlines()
    t = [l for l in t if not re.search(r"^\s+✓ .*(TEST-(1[1-4]|4[5-8])|-> 40)", l)][:16]
    f.append(f"<p class='label'>{label}</p>" + pre("\n".join(t)))

f.append("<h2>F.5 Engineering workflow and history</h2>")
hist = git("log", "--reverse", "--format=%h|%ad|%an|%s", "--date=format:%Y-%m-%d %H:%M", "feature/7-ui-e2e")
rows = "".join(f"<tr><td><code>{h}</code></td><td>{d}</td><td>{html.escape(s)}</td></tr>" for h, d, a, s in (l.split("|", 3) for l in hist.splitlines()))
f.append("<p>Contracts and test design (#1, and each <code>test:</code> commit) were recorded before the matching <code>feat:</code> commit. Commit IDs and dates are preserved:</p><table class='small'><thead><tr><th>Commit</th><th>Date</th><th>Message</th></tr></thead><tbody>" + rows + "</tbody></table>")
f.append(doc(S1 / "workflow.md", 2))
wf_shots = sorted((EV / "screenshots").glob("gh-*.png"))
for p in wf_shots: f.append(shot(p.name, p.stem.replace("gh-", "GitHub: ").replace("-", " ")))
f.append(doc(S1 / "team-and-ai.md", 2))
parts.append(("F", "Part F — Working Sprint 1 and verification", "".join(f)))

NAV_IDS = {"A": "Actors, FR-01 – FR-22, BR-01 – BR-24, NFR-01 – NFR-12, AS-01 – AS-05, D-01 – D-11",
           "B": "F-01 – F-17; full FR/BR/NFR → feature → sprint → AC/TEST table",
           "C": "Architecture, ERD, UI/API conventions, role matrix, sessions, config, GCP plan",
           "D": "Sprints 1 – 3, Sprint 1 Issues #1 – #7",
           "E": "F-01 – F-08, AC-01 – AC-42, TEST-01 – TEST-52, DoD",
           "F": "Scenarios 1 – 3, 107 test results, AC → test table, TEST-12/28/29/35 excerpts, TDD red/green, workflow, contributions"}

CSS = """@page { size: A4; margin: 16mm 14mm 18mm 14mm; }
body { font-family: 'DejaVu Sans', Arial, sans-serif; font-size: 9.2pt; color: #1d2733; line-height: 1.38; }
h1.part { font-size: 17pt; color: #1f5f8b; border-bottom: 2px solid #1f5f8b; padding-bottom: 4px; page-break-before: always; margin-top: 0; }
h2 { font-size: 12.5pt; color: #1f5f8b; margin: 16px 0 6px; } h3 { font-size: 10.5pt; margin: 12px 0 4px; } h4 { font-size: 9.5pt; }
table { border-collapse: collapse; width: 100%; margin: 6px 0 10px; font-size: 8.2pt; page-break-inside: auto; }
tr { page-break-inside: avoid; } th, td { border: 1px solid #c9d3dd; padding: 3px 5px; vertical-align: top; text-align: left; }
th { background: #eef4f9; } table.small { font-size: 7.6pt; } table.kv th { width: 18%; }
code { font-family: 'DejaVu Sans Mono', monospace; font-size: 8pt; background: #f2f4f6; padding: 0 2px; }
pre { font-family: 'DejaVu Sans Mono', monospace; font-size: 7.3pt; background: #f6f8fa; border: 1px solid #dde3e9; padding: 6px; white-space: pre-wrap; word-break: break-word; page-break-inside: auto; }
pre code { background: none; } img { max-width: 100%; } p img { max-height: 120mm; display: block; margin: 6px auto; }
figure { margin: 8px 0; page-break-inside: avoid; text-align: center; } figure img { max-height: 105mm; border: 1px solid #c9d3dd; }
figcaption { font-size: 8pt; color: #5b6876; margin-top: 3px; } .label { font-weight: bold; margin-bottom: 2px; }
blockquote { border-left: 3px solid #f0b429; margin: 6px 0; padding: 2px 10px; background: #fff8e6; }
.cover h1 { font-size: 24pt; color: #1f5f8b; margin: 30mm 0 4px; } .cover .sub { font-size: 13pt; color: #5b6876; margin-bottom: 18mm; }
.cover table { font-size: 10pt; } .toc a, .nav a { color: #1d2733; text-decoration: none; }
.toc li { list-style: none; display: flex; } .toc .dots { flex: 1; border-bottom: 1px dotted #999; margin: 0 4px 4px; } .toc ul { padding-left: 14px; }
"""

def build(pages):
    pg = lambda key: pages.get(key, "?")
    rng = lambda pid: f"{pg('PART-'+pid)}–{pages.get('END-'+pid, '?')}"
    cover = f"""<section class='cover'><h1>MoneyLog</h1><div class='sub'>CPE 334 Project Deliverable 1 — Engineering baseline and working Sprint 1</div>
<table><tr><th>Students</th><td>Tammathorn Kananurak — 67070503489 — @Tammathorn<br>Chakriwat Srivilai — 67070503407 — @GusGusxz</td></tr>
<tr><th>Theme / context</th><td>7. Personal Money and Expense Logging System — multi-user THB money logging for Thai students and early-career staff; admin controls sign-in only</td></tr>
<tr><th>Repository</th><td>{REPO}</td></tr><tr><th>Submitted release</th><td>{REL} (tested commit <code>{COMMIT}</code>)</td></tr>
<tr><th>Semester</th><td>1/2026</td></tr></table>"""
    nav = "<h2>Navigation</h2><table class='nav'><thead><tr><th>Part</th><th>Pages</th><th>Relevant IDs</th></tr></thead><tbody>"
    for pid, title, _ in parts:
        nav += f"<tr><td><a href='#part-{pid}'>{html.escape(title)}</a></td><td>{rng(pid)}</td><td>{NAV_IDS[pid]}</td></tr>"
    nav += "</tbody></table><p>Execution evidence for the Part E contracts is in Part F: scenarios in F.2, results in F.3, test excerpts in F.4 (pages " + f"{pg('H-F.2')}–{pages.get('END-F','?')}).</p></section>"
    body, toc = "", "<section style='page-break-before:always'><h2>Table of contents</h2><ul class='toc'>"
    for pid, title, h in parts:
        hs = re.findall(r"<h2[^>]*>(.*?)</h2>", h)
        toc += f"<li><a href='#part-{pid}'><b>{html.escape(title)}</b></a><span class='dots'></span>{pg('PART-'+pid)}</li><ul>"
        for i, t in enumerate(hs):
            plain = re.sub("<[^>]+>", "", t)
            toc += f"<li><span>{plain}</span><span class='dots'></span>{pg(f'H-{pid}-{i}')}</li>"
        toc += "</ul>"
        counter = iter(range(1000))
        h2 = re.sub(r"<h2([^>]*)>", lambda m: f"<h2{m.group(1)} data-key='H-{pid}-{next(counter)}'>", h)
        body += f"<h1 class='part' id='part-{pid}' data-key='PART-{pid}'>{html.escape(title)}</h1>{h2}<span data-key='END-{pid}'></span>"
    toc += "</ul></section>"
    return f"<!doctype html><html><head><meta charset='utf-8'><style>{CSS}</style></head><body>{cover}{nav}{toc}{body}</body></html>"

def render(html_text, pdf_path):
    tmp = OUT.with_suffix(".html"); tmp.write_text(html_text)
    js = f"""const {{ chromium }} = require('@playwright/test');
(async () => {{ const b = await chromium.launch(); const p = await b.newPage();
 await p.goto('file://{tmp}'); await p.waitForLoadState('networkidle');
 await p.pdf({{ path: '{pdf_path}', format: 'A4', printBackground: true, displayHeaderFooter: true,
   headerTemplate: '<span></span>', footerTemplate: '<div style="font-size:7pt;width:100%;text-align:center;color:#777">MoneyLog — Project Deliverable 1 — page <span class=pageNumber></span> of <span class=totalPages></span></div>',
   margin: {{ top: '14mm', bottom: '16mm', left: '13mm', right: '13mm' }} }});
 await b.close(); }})();"""
    subprocess.run(["node", "-e", js], cwd=ROOT, check=True)

def page_map(pdf_path, html_text):
    # Locate each data-key element's page by searching its text in per-page extracted text.
    keys = re.findall(r"<(h1|h2|span)[^>]*data-key='([^']+)'[^>]*>(.*?)</\1>", html_text, re.S)
    n = int(re.search(r"Pages:\s+(\d+)", subprocess.check_output(["pdfinfo", str(pdf_path)], text=True)).group(1))
    texts = [re.sub(r"\s+", " ", subprocess.check_output(["pdftotext", "-f", str(i), "-l", str(i), "-layout", str(pdf_path), "-"], text=True)) for i in range(1, n + 1)]
    pages, cursor, last_part = {}, 3, None
    for tag, key, inner in keys:
        plain = re.sub(r"\s+", " ", html.unescape(re.sub("<[^>]+>", "", inner))).strip()
        if key.startswith("END-"):
            continue
        probe = plain[:40]
        for i in range(cursor, n + 1):
            if probe and probe in texts[i - 1]:
                pages[key] = i; cursor = i; break
    order = [p[0] for p in parts]
    for idx, pid in enumerate(order):
        nxt = pages.get(f"PART-{order[idx+1]}") if idx + 1 < len(order) else None
        pages[f"END-{pid}"] = (nxt - 1) if nxt else n
    if "H-F-1" in pages: pages["H-F.2"] = pages["H-F-1"]
    return pages

pages = {}
for _ in range(3):
    h = build(pages); render(h, OUT); new = page_map(OUT, h)
    if new == pages: break
    pages = new
print(json.dumps({k: v for k, v in pages.items() if k.startswith(("PART", "END"))}))
