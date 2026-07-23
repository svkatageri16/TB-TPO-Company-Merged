import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface User {
  id: number;
  email: string;
  role: "STUDENT" | "COMPANY" | "ADMIN" | "SUPER_ADMIN" | "TPO";
  is_verified: boolean;
  sidebarPermissions?: string[] | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  profile: any | null;
  loading: boolean;
  login: (data: any) => void;
  logout: () => void;
  updateProfile: (profile: any) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedAuth = localStorage.getItem("vega_auth");
    if (savedAuth) {
      const { user, token, profile } = JSON.parse(savedAuth);
      setUser(user);
      setToken(token);
      setProfile(profile);
      if (token) {
        localStorage.setItem("token", token);
      }
    }
    setLoading(false);
  }, []);

  const login = (data: any) => {
    setUser(data.user);
    setToken(data.token);
    setProfile(data.profile);
    localStorage.setItem("vega_auth", JSON.stringify(data));
    if (data.token) {
      localStorage.setItem("token", data.token);
    }
  };

  const updateProfile = (newProfile: any) => {
    setProfile(newProfile);
    const savedAuth = localStorage.getItem("vega_auth");
    if (savedAuth) {
      const auth = JSON.parse(savedAuth);
      auth.profile = newProfile;
      localStorage.setItem("vega_auth", JSON.stringify(auth));
    }
  };

  const logout = async () => {
    const savedAuth = localStorage.getItem("vega_auth");
    if (savedAuth) {
      try {
        const { refreshToken } = JSON.parse(savedAuth);
        import("../services/api").then(api => {
          api.default.post("/auth/logout", { refreshToken }).catch(() => {});
        });
      } catch (e) {}
    }
    setUser(null);
    setToken(null);
    setProfile(null);
    localStorage.removeItem("vega_auth");
    localStorage.removeItem("token");
  };

  return (
    <AuthContext.Provider value={{ user, token, profile, loading, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
