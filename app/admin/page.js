"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) {
      setError("Invalid credentials");
      setLoading(false);
      return;
    }
    // Fetch profile to check role
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();
    if (profileError || !profile || profile.role !== "admin") {
      setError("You are not authorized as admin.");
      setLoading(false);
      await supabase.auth.signOut();
      return;
    }
    // Redirect to admin dashboard (or reload)
    router.push("/admin/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-blue-200 to-blue-300">
      <div className="relative w-full max-w-md p-8 rounded-2xl shadow-2xl bg-white bg-opacity-90 backdrop-blur-lg border border-blue-200">
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-700 rounded-full flex items-center justify-center shadow-lg border-4 border-white/30">
          <svg width="40" height="40" fill="none" viewBox="0 0 24 24"><path fill="#2563eb" d="M12 2a7 7 0 0 1 7 7c0 3.87-3.13 7-7 7s-7-3.13-7-7a7 7 0 0 1 7-7Zm0 16c4.42 0 8 1.79 8 4v2H4v-2c0-2.21 3.58-4 8-4Z"/></svg>
        </div>
        <form
          onSubmit={handleLogin}
          className="flex flex-col gap-6 mt-12"
          style={{ minWidth: 320 }}
        >
          <h2 className="text-3xl font-extrabold text-center mb-2 drop-shadow text-blue-900">Admin Login</h2>
          <div className="flex flex-col gap-2">
            <label className="font-semibold text-blue-900">Email</label>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="px-4 py-2 rounded-lg bg-white bg-opacity-100 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 border border-blue-200"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="font-semibold text-blue-900">Password</label>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="px-4 py-2 rounded-lg bg-white bg-opacity-100 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 border border-blue-200"
            />
          </div>
          {error && <div className="text-red-600 text-center font-semibold">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white font-bold py-2 rounded-lg shadow-lg transition mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Logging in..." : "Login as Admin"}
          </button>
        </form>
      </div>
    </div>
  );
}