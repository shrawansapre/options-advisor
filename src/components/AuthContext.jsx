import { createContext, useContext, useEffect, useState } from "react";
import { getSession, login, logout } from "../lib/account";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading, null = signed out

  useEffect(() => {
    let cancelled = false;
    getSession().then(next => {
      if (!cancelled) setUser(next);
    });
    return () => { cancelled = true; };
  }, []);

  async function signInWithPassword(email, password) {
    try {
      const next = await login(email, password);
      setUser(next);
      return {};
    } catch (err) {
      return { error: { message: err.message || "Sign in failed" } };
    }
  }

  async function signOut() {
    await logout();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, signInWithPassword, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
