import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('canteen_auth');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setUser(data.user);
        setToken(data.token);
      } catch { localStorage.removeItem('canteen_auth'); }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('canteen_auth', JSON.stringify(data));
    return data.user;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('canteen_auth');
  };

  const authFetch = async (url, options = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: { ...options.headers, 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
    if (res.status === 401 || res.status === 403) { logout(); throw new Error('Session expired'); }
    return res;
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, authFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
