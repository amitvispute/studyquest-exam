import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

type AppRole = "parent" | "student";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  displayName: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  role: null,
  displayName: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchIdRef = useRef(0);

  // Phase A: session restore only
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (!session?.user) {
          setRole(null);
          setDisplayName(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Phase B: fetch role & profile separately
  useEffect(() => {
    if (!user?.id) {
      setRole(null);
      setDisplayName(null);
      return;
    }

    const currentFetchId = ++fetchIdRef.current;

    const fetchUserData = async () => {
      try {
        const [{ data: roleData }, { data: profileData }] = await Promise.all([
          supabase.from("user_roles").select("role").eq("user_id", user.id).single(),
          supabase.from("profiles").select("display_name").eq("id", user.id).single(),
        ]);
        if (fetchIdRef.current !== currentFetchId) return; // stale
        setRole((roleData?.role as AppRole) ?? null);
        setDisplayName(profileData?.display_name ?? null);
      } catch {
        if (fetchIdRef.current !== currentFetchId) return;
        setRole(null);
        setDisplayName(null);
      }
    };

    fetchUserData();
  }, [user?.id]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setDisplayName(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, displayName, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
