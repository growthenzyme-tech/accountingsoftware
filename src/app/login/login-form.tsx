"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/ui/logo";
import { Wallet } from "lucide-react";

export default function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { signIn, error: authError, success, clearError, clearSuccess } = useAuth();
  const redirect = searchParams.get("redirect") || "/dashboard";


  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateEmail = (value: string) => {
    if (!value) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Please enter a valid email address";
    return "";
  };

  const validatePassword = (value: string) => {
    if (!value) return "Password is required";
    return "";
  };

  const handleBlur = (field: string, value: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (field === "email") setErrors((prev) => ({ ...prev, email: validateEmail(value) }));
    if (field === "password") setErrors((prev) => ({ ...prev, password: validatePassword(value) }));
  };

  const handleChange = (field: string, value: string) => {
    if (field === "email") setEmail(value);
    if (field === "password") setPassword(value);
    if (success) clearSuccess();
    if (touched[field]) {
      if (field === "email") setErrors((prev) => ({ ...prev, email: validateEmail(value) }));
      if (field === "password") setErrors((prev) => ({ ...prev, password: validatePassword(value) }));
    }
  };

 const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault();

  clearError();
  clearSuccess();

  const emailError = validateEmail(email);
  const passwordError = validatePassword(password);

  if (emailError || passwordError) {
    setErrors({ email: emailError, password: passwordError });
    setTouched({ email: true, password: true });
    return;
  }

  setLoading(true);

  try {
    await signIn(email, password);
    // signIn() handles the redirect after successful authentication.
  } catch {
    // The authentication context handles the error.
  } finally {
    setLoading(false);
  }
};

  // const handleForgotPassword = async () => {
  //   if (!email) {
  //     setErrors((prev) => ({ ...prev, email: "Please enter your email first" }));
  //     setTouched((prev) => ({ ...prev, email: true }));
  //     return;
  //   }
  //   const emailError = validateEmail(email);
  //   if (emailError) {
  //     setErrors((prev) => ({ ...prev, email: emailError }));
  //     setTouched((prev) => ({ ...prev, email: true }));
  //     return;
  //   }
  //   router.push(`/reset-password?email=${encodeURIComponent(email)}`);
  // };

  return (
   <main className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-6 text-foreground">
      <div className="w-full max-w-md">
        <div className="mx-auto mb-4 text-center">
          <Link href="/dashboard" className="inline-flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
             <Wallet className="h-6 w-6" />
            </div>
          </Link>
        </div>

        <div className="space-y-5 rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Welcome</h2>
           <p className="text-sm text-muted-foreground">Sign in to manage your business finances.</p>
          </div>

          {authError && (
            <div
              role="alert"
              className="rounded-lg border border-orange-500/50 bg-orange-500/10 p-3 text-sm text-orange-700"
            >
              {authError}
            </div>
          )}

          {success && (
            <div
              role="status"
              className="rounded-lg border border-green-500/50 bg-green-500/10 p-3 text-sm text-green-700"
            >
              {success}
            </div>
          )}

         <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  onBlur={(e) => handleBlur("email", e.target.value)}
                  className="h-10 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:bg-muted/50"
                  placeholder="you@company.com"
                  aria-invalid={touched.email && !!errors.email}
                  aria-describedby={touched.email && errors.email ? "email-error" : undefined}
                  disabled={loading}
                />
              </div>
              {errors.email && (
                <p id="email-error" role="alert" className="text-sm text-orange-700">
                  {errors.email}
                </p>
              )}
            </div>

            <div className="space-y-2">
              
<div>
  <Label htmlFor="password" className="text-sm font-medium text-foreground">
    Password
  </Label>
</div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  onBlur={(e) => handleBlur("password", e.target.value)}
                  className="h-10 w-full rounded-lg border border-border bg-background pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:bg-muted/50"
                  placeholder="••••••••"
                  aria-invalid={touched.password && !!errors.password}
                  aria-describedby={touched.password && errors.password ? "password-error" : undefined}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" role="alert" className="text-sm text-orange-700">
                  {errors.password}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
                />
                <span className="text-sm text-muted-foreground">Remember me</span>
              </label>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="h-10 w-full rounded-lg bg-primary text-sm font-medium text-primary-foreground transition-all duration-150 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          {/* <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-medium text-primary underline underline-offset-2 hover:text-primary/80 transition-colors">
              Create an account
            </Link>
          </p> */}
        </div>

        {/* <p className="mt-6 text-center text-xs text-muted-foreground/60">
          By signing in, you agree to our{" "}
          <Link href="/terms" className="underline underline-offset-2 hover:text-foreground transition-colors">Terms of Service</Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground transition-colors">Privacy Policy</Link>
        </p> */}
      </div>
    </main>
  );
}