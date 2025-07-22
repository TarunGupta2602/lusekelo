"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import Image from "next/image";

export default function AuthPage() {
  const [mode, setMode] = useState("signup"); // 'signup' or 'login'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showVerifyMessage, setShowVerifyMessage] = useState(false);
  const router = useRouter();

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data: authData, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });
      if (signupError) throw new Error(`Signup error: ${signupError.message}`);
      if (!authData.user) throw new Error("Sign-up failed, please try again.");
      setShowVerifyMessage(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (loginError) throw new Error(`Login error: ${loginError.message}`);
      if (!data.user) throw new Error("Login failed, please try again.");
      router.push("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
      });
      if (error) throw new Error(error.message);
    } catch (err) {
      setError("Google authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full border border-gray-100">
        <div className="flex flex-col items-center mb-6">
          <Image src="/appicon.png" alt="Lusekelo Logo" width={60} height={60} className="mb-2" />
          <h1 className="text-3xl font-bold text-gray-800 mb-1">Lusekelo</h1>
          {!showVerifyMessage && (
            <div className="flex gap-2 mt-2">
              <button
                className={`px-4 py-1 rounded-full text-sm font-medium transition ${mode === "signup" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600"}`}
                onClick={() => { setMode("signup"); setError(""); setShowVerifyMessage(false); }}
              >
                Sign Up
              </button>
              <button
                className={`px-4 py-1 rounded-full text-sm font-medium transition ${mode === "login" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600"}`}
                onClick={() => { setMode("login"); setError(""); setShowVerifyMessage(false); }}
              >
                Log In
              </button>
            </div>
          )}
        </div>
        {showVerifyMessage ? (
          <div className="text-center space-y-4">
            <Image src="/verify.png" alt="Verify Email" width={80} height={80} className="mx-auto" />
            <h2 className="text-xl font-bold text-green-700">Verify your email</h2>
            <p className="text-gray-600">
              We’ve sent a verification link to <span className="font-semibold">{email}</span>.<br />
              Please check your inbox and verify your email to continue.
            </p>
            <button
              className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 transition"
              onClick={() => { setShowVerifyMessage(false); setMode("login"); }}
            >
              Go to Login
            </button>
          </div>
        ) : (
          <>
            <form onSubmit={mode === "signup" ? handleSignup : handleLogin} className="space-y-5">
              {mode === "signup" && (
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full Name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-200"
                  required
                />
              )}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-200"
                required
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-200"
                required
              />
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition font-semibold"
              >
                {loading ? (mode === "signup" ? "Signing up..." : "Logging in...") : (mode === "signup" ? "Sign Up" : "Log In")}
              </button>
            </form>
            <div className="my-4 flex items-center gap-2 text-sm text-gray-500">
              <div className="flex-grow border-t" />
              OR
              <div className="flex-grow border-t" />
            </div>
            <button
              onClick={handleGoogleAuth}
              className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 py-2 rounded-md shadow-sm hover:bg-gray-100 font-semibold"
              disabled={loading}
            >
              <Image
                src="/google-icon.svg"
                alt="Google"
                width={20}
                height={20}
                className="w-5 h-5"
              />
              {mode === "signup" ? "Sign up with Google" : "Log in with Google"}
            </button>
          </>
        )}
      </div>
    </div>
  );
} 