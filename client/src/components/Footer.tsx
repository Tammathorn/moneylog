import { useEffect, useState } from "react";

// Shows which release is running (Lab 5 R-08): the short commit from /api/version.
export function Footer() {
  const [commit, setCommit] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/version")
      .then((r) => (r.ok ? r.json() : null))
      .then((v) => setCommit(typeof v?.commit === "string" ? v.commit : null))
      .catch(() => setCommit(null));
  }, []);
  const label = commit && /^[0-9a-f]{7,40}$/.test(commit) ? commit.slice(0, 7) : commit ?? "…";
  return (
    <footer className="app-footer">
      MoneyLog · Personal money logging · release <code data-testid="release-commit">{label}</code>
    </footer>
  );
}
