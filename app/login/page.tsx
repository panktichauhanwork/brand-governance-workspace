"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Eye, EyeOff } from "lucide-react";

const inputCls =
  "w-full border border-[#D4D4D4] px-3 py-2.5 text-sm text-[#2B2B2B] bg-white focus:outline-none focus:border-[#2B2B2B] placeholder:text-[#B3B3B3] transition-colors";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.error) {
      setError("Invalid email or password");
      setLoading(false);
    } else {
      router.push("/");
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left — dark panel */}
      <div className="hidden lg:flex w-1/2 bg-[#2B2B2B] flex-col justify-between p-14">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.25em] text-[#B3B3B3] uppercase mb-3">
            Brand Governance
          </p>
          <h1 className="text-4xl font-bold text-white leading-tight">
            Brand voice.<br />Structured.<br />AI-powered.
          </h1>
        </div>
        <div>
          <p className="text-[#B3B3B3] text-sm leading-relaxed mb-8 max-w-sm">
            Define your brand guidelines once. Every piece of content your team generates will be scored and reviewed against them automatically.
          </p>
          <div className="flex flex-wrap gap-2">
            {["Multi-tenant", "RBAC", "Compliance scoring", "Audit trail"].map((tag) => (
              <span key={tag} className="text-[10px] font-semibold tracking-wider uppercase px-2.5 py-1 border border-white/20 text-[#B3B3B3]">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center px-8 bg-white">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-10">
            <p className="text-[10px] font-semibold tracking-[0.25em] text-[#B3B3B3] uppercase">Brand Governance</p>
          </div>

          <h2 className="text-2xl font-bold text-[#2B2B2B] mb-1">Sign in</h2>
          <p className="text-sm text-[#B3B3B3] mb-8">Enter your credentials to access your workspace</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="text-sm text-[#2B2B2B] bg-[#F5F5F5] border border-[#D4D4D4] px-3 py-2.5">
                {error}
              </div>
            )}

            <div>
              <label className="block text-[10px] font-semibold tracking-[0.15em] uppercase text-[#B3B3B3] mb-1.5">
                Email
              </label>
              <input type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com" className={inputCls} />
            </div>

            <div>
              <label className="block text-[10px] font-semibold tracking-[0.15em] uppercase text-[#B3B3B3] mb-1.5">
                Password
              </label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} required value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" className={inputCls} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B3B3B3] hover:text-[#2B2B2B] transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#2B2B2B] text-white py-2.5 text-sm font-semibold hover:bg-black disabled:opacity-50 transition-colors mt-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? "Signing in…" : "Sign in"}
            </button>

            <p className="text-center text-sm text-[#B3B3B3] pt-1">
              No account?{" "}
              <Link href="/register" className="text-[#2B2B2B] font-semibold hover:underline">
                Create one
              </Link>
            </p>
          </form>

          {/* Demo accounts */}
          <div className="mt-10 border border-[#D4D4D4] p-4">
            <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-[#B3B3B3] mb-3">
              Demo accounts
            </p>
            <div className="space-y-1">
              {[
                { label: "Admin", email: "admin@demo.com" },
                { label: "Reviewer", email: "reviewer@demo.com" },
                { label: "Client", email: "client@demo.com" },
              ].map(({ label, email: e }) => (
                <button key={e} type="button"
                  onClick={() => { setEmail(e); setPassword("password123"); }}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-[#F5F5F5] transition-colors text-left">
                  <span className="text-xs font-semibold text-[#2B2B2B]">{label}</span>
                  <span className="text-xs text-[#B3B3B3] font-mono">{e}</span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-[#B3B3B3] mt-2.5">Password: <code className="font-mono">password123</code></p>
          </div>
        </div>
      </div>
    </div>
  );
}
