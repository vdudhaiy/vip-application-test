import React, { createContext, useState, useEffect, useContext } from 'react';
import API_ENDPOINTS from '../config/api';

type User = {
  id: number;
  username: string;
  email: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  signup: (username: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async (token: string) => {
    try {
      const res = await fetch(API_ENDPOINTS.ME, {
        headers: {
          Authorization: `Token ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      }
    } catch (err) {
      console.error('Failed to fetch current user', err);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    const res = await fetch(API_ENDPOINTS.LOGIN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (res.ok) {
      const data = await res.json();
      const token = data.token;
      localStorage.setItem('token', token);
      const userData = data.user;
      setUser(userData);
      return true;
    }

    return false;
  };

  const signup = async (username: string, email: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch(API_ENDPOINTS.SIGNUP, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password }),
      });

      if (res.ok) {
        const data = await res.json();
        const token = data.token;
        localStorage.setItem('token', token);
        const userData = data.user;
        setUser(userData);
        return true;
      } else {
        const errorData = await res.json();
        console.error('Signup failed:', errorData);
      }
    } catch (err) {
      console.error('Signup error:', err);
    }

    return false;
  };

  const logout = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      await fetch(API_ENDPOINTS.LOGOUT, {
        method: 'POST',
        headers: {
          Authorization: `Token ${token}`,
        },
      });
    }

    setUser(null);
    localStorage.removeItem('token');
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchCurrentUser(token);
    } else {
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export { AuthProvider, useAuth };