"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  User,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  AuthError,
  getIdToken,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter, usePathname } from "next/navigation";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  success: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  clearError: () => void;
  clearSuccess: () => void;
  setSuccess: (message: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function setSessionCookie(token: string) {
  try {
    const response = await fetch("/api/auth/session", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Session service returned HTTP ${response.status}.`);
    }
  } catch (error) {
    console.error("Secure session cookie creation failed:", error);
    throw new Error("Unable to establish a secure session.");
  }
}

async function clearSessionCookie() {
  try {
    const response = await fetch("/api/auth/session", {
      method: "DELETE",
    });

    if (!response.ok) {
      document.cookie = "__session=; path=/; max-age=0; SameSite=Lax";
      return;
    }
  } catch {
    document.cookie = "__session=; path=/; max-age=0; SameSite=Lax";
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

 useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
    setUser(currentUser);

    try {
      if (currentUser) {
        const token = await getIdToken(currentUser);
        await setSessionCookie(token);
      } else {
        await clearSessionCookie();
      }
    } catch (error) {
      console.error("Session synchronization failed:", error);
      setError("Unable to verify your session. Please sign in again.");
    } finally {
      setLoading(false);
    }
  });

  // Listen for profile updates
  const handleAuthUpdate = (event: CustomEvent) => {
    setUser(event.detail);
  };
  window.addEventListener('auth-update', handleAuthUpdate as EventListener);
  return () => {
    unsubscribe();
    window.removeEventListener('auth-update', handleAuthUpdate as EventListener);
  };
}, []);

  const signIn = async (email: string, password: string) => {
    setError(null);
    setSuccess(null);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const token = await getIdToken(result.user);
      await setSessionCookie(token);
      setSuccess("Welcome back! You've successfully signed in.");
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      const authError = err as AuthError;
      switch (authError.code) {
        case "auth/user-not-found":
          setError("No account found with this email address.");
          break;
        case "auth/wrong-password":
        case "auth/invalid-credential":
          setError("Incorrect password. Please try again.");
          break;
        case "auth/invalid-email":
          setError("Please enter a valid email address.");
          break;
        case "auth/too-many-requests":
          setError("Too many failed attempts. Please try again later.");
          break;
        case "auth/user-disabled":
          setError("This account has been disabled. Contact support.");
          break;
        default:
          setError("Unable to sign in. Check your email and password.");
      }
      throw err;
    }
  };



const signOut = async () => {
  setError(null);
  setSuccess(null);

  try {
    // First, sign out from Firebase Authentication.
    await firebaseSignOut(auth);

    // Then clear the server-side session cookie.
    await clearSessionCookie();

    // Update the local authentication state.
    setUser(null);

    // Navigate directly to the login page.
    router.replace("/login");
    router.refresh();
  } catch (error) {
    console.error("Sign out failed:", error);
    setError("Failed to sign out. Please try again.");
  }
};



  const resetPassword = async (email: string) => {
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      const authError = err as AuthError;
      switch (authError.code) {
        case "auth/user-not-found":
          setError("No account found with this email address.");
          break;
        case "auth/invalid-email":
          setError("Please enter a valid email address.");
          break;
        default:
          setError("Failed to send reset email. Please try again.");
      }
      throw err;
    }
  };

  const clearError = () => setError(null);
  const clearSuccess = () => setSuccess(null);
  const setSuccessMessage = (message: string) => setSuccess(message);

  return (
    <AuthContext.Provider value={{ user, loading, error, success, signIn, signOut, resetPassword, clearError, clearSuccess, setSuccess: setSuccessMessage }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function useUser() {
  const { user, loading } = useAuth();
  return { user, loading };
}

export function useRequireAuth() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [user, loading, router, pathname]);

  return { user, loading };
}

export function useRedirectIfAuthenticated() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && user) {
      const redirectUrl = new URLSearchParams(window.location.search).get("redirect") || "/dashboard";
      router.replace(redirectUrl);
    }
  }, [user, loading, router]);
}