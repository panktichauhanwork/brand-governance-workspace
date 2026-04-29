"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Eye, EyeOff } from "lucide-react";

const inputCls =
  "w-full border border-[#D4D4D4] px-3 py-2.5 text-sm text-[#2B2B2B] bg-white focus:outline-none focus:border-[#2B2B2B] placeholder:text-[#B3B3B3] transition-colors";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Registration failed");
      setLoading(false);
      return;
    }

    await signIn("credentials", { email: form.email, password: form.password, redirect: false });
    router.push("/");
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 bg-[#2B2B2B] flex-col justify-between p-14">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.25em] text-[#B3B3B3] uppercase mb-3">
            Brand Governance
          </p>
          <h1 className="text-4xl font-bold text-white leading-tight">
            Your workspace<br />is created<br />automatically.
          </h1>
        </div>
        <div>
          <p className="text-[#B3B3B3] text-sm leading-relaxed mb-8 max-w-sm">
            Invite your team, configure your brand voice, and start generating compliant content within minutes.
          </p>
          <div className="flex flex-wrap gap-2">
            {["Multi-tenant", "RBAC", "AI-powered", "Audit trail"].map((tag) => (
              <span key={tag} className="text-[10px] font-semibold tracking-wider uppercase px-2.5 py-1 border border-white/20 text-[#B3B3B3]">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-8 bg-white">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-10">
            <p className="text-[10px] font-semibold tracking-[0.25em] text-[#B3B3B3] uppercase">Brand Governance</p>
          </div>

          <h2 className="text-2xl font-bold text-[#2B2B2B] mb-1">Create account</h2>
          <p className="text-sm text-[#B3B3B3] mb-8">A workspace will be created for you automatically</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="text-sm text-[#2B2B2B] bg-[#F5F5F5] border border-[#D4D4D4] px-3 py-2.5">
                {error}
              </div>
            )}

            <div>
              <label className="block text-[10px] font-semibold tracking-[0.15em] uppercase text-[#B3B3B3] mb-1.5">Full name</label>
              <input type="text" required value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Jane Smith" className={inputCls} />
            </div>

            <div>
              <label className="block text-[10px] font-semibold tracking-[0.15em] uppercase text-[#B3B3B3] mb-1.5">Email</label>
              <input type="email" required value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@company.com" className={inputCls} />
            </div>

            <div>
              <label className="block text-[10px] font-semibold tracking-[0.15em] uppercase text-[#B3B3B3] mb-1.5">Password</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} required minLength={6} value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
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
              <p className="text-[11px] text-[#B3B3B3] mt-1">Minimum 6 characters</p>
            </div>

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#2B2B2B] text-white py-2.5 text-sm font-semibold hover:bg-black disabled:opacity-50 transition-colors mt-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? "Creating account…" : "Create account"}
            </button>

            <p className="text-center text-sm text-[#B3B3B3] pt-1">
              Already have an account?{" "}
              <Link href="/login" className="text-[#2B2B2B] font-semibold hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
