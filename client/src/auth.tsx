import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, setUnauthorizedHandler, type User } from "./api";

interface AuthState { user: User | null; loading: boolean; notice: string | null; signIn(email: string, password: string): Promise<User>; signOut(): Promise<void> }
const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser((current) => {
        if (current) setNotice("Your session has ended. Please sign in again.");
        return null;
      });
    });
    api<{ user: User }>("/auth/me", { quiet401: true })
      .then((r) => setUser(r.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const r = await api<{ user: User }>("/auth/login", { method: "POST", body: { email, password }, quiet401: true });
    setNotice(null);
    setUser(r.user);
    return r.user;
  }, []);
  const signOut = useCallback(async () => {
    await api("/auth/logout", { method: "POST", quiet401: true }).catch(() => {});
    setUser(null);
  }, []);

  return <Ctx.Provider value={{ user, loading, notice, signIn, signOut }}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth outside AuthProvider");
  return v;
}
