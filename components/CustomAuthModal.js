import React, { useState } from "react";
import Image from "next/image";
import { supabase } from "../lib/supabaseClient";

export default function CustomAuthModal({ open, onClose }) {
  const [mode, setMode] = useState("signup");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showVerifyMessage, setShowVerifyMessage] = useState(false);

  if (!open) return null;

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    if (!agree) {
      setError("You must agree to the Terms & Conditions.");
      return;
    }
    setLoading(true);
    try {
      const { data: authData, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: `${firstName} ${lastName}`.trim(),
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
    setError("");
    setLoading(true);
    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (loginError) throw new Error(`Login error: ${loginError.message}`);
      if (!data.user) throw new Error("Login failed, please try again.");
      onClose();
      window.location.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    if (mode === "signup") return handleSignup(e);
    return handleLogin(e);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="flex w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden relative pointer-events-auto">
        {/* Illustration Left */}
        <div className="hidden md:flex flex-col justify-center items-center bg-gray-50 w-1/2 p-8">
          <Image src="/illustration-person-map.jpg" alt="Sign up illustration" width={320} height={320} className="mb-4 rounded-xl" />
          <div className="text-center">
            <div className="inline-flex items-center bg-white px-4 py-2 rounded-lg shadow">
              <span className="font-semibold text-gray-700 mr-2">Password</span>
              <span className="tracking-widest text-lg">****</span>
            </div>
          </div>
        </div>
        {/* Form Right */}
        <div className="flex-1 bg-[#0d2329] p-8 flex flex-col justify-center min-w-[320px]">
          <button
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 text-2xl font-bold"
            onClick={onClose}
            aria-label="Close"
            type="button"
          >
            &times;
          </button>
          {showVerifyMessage ? (
            <div className="text-center space-y-4">
              <Image src="/verify.png" alt="Verify Email" width={80} height={80} className="mx-auto" />
              <h2 className="text-xl font-bold text-green-400">Verify your email</h2>
              <p className="text-gray-300">
                We’ve sent a verification link to <span className="font-semibold">{email}</span>.<br />
                Please check your inbox and verify your email to continue.
              </p>
              <button
                className="mt-4 bg-[#bdeb6d] text-[#0d2329] px-6 py-2 rounded-md hover:bg-[#a5d55f] transition font-bold"
                onClick={() => { setShowVerifyMessage(false); setMode("login"); }}
              >
                Go to Login
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-white mb-2">Hang on,</h2>
              <p className="text-lg font-semibold mb-4" style={{ color: "#bdeb6d" }}>
                Have you signed up with us yet?
              </p>
              <p className="text-gray-300 text-sm mb-6">
                Already have an account?{' '}
                <span
                  className="underline cursor-pointer text-[#bdeb6d]"
                  onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setError(""); setShowVerifyMessage(false); }}
                >
                  {mode === "signup" ? "Login" : "Sign up"}
                </span>
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "signup" && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="First Name"
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      className="flex-1 px-4 py-2 rounded-md bg-[#14343b] text-white placeholder-gray-400 border border-gray-600 focus:ring-2 focus:ring-[#bdeb6d]"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Last Name"
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      className="flex-1 px-4 py-2 rounded-md bg-[#14343b] text-white placeholder-gray-400 border border-gray-600 focus:ring-2 focus:ring-[#bdeb6d]"
                      required
                    />
                  </div>
                )}
                <input
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-2 rounded-md bg-[#14343b] text-white placeholder-gray-400 border border-gray-600 focus:ring-2 focus:ring-[#bdeb6d]"
                  required
                />
                <input
                  type="password"
                  placeholder="Enter a password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-2 rounded-md bg-[#14343b] text-white placeholder-gray-400 border border-gray-600 focus:ring-2 focus:ring-[#bdeb6d]"
                  required
                />
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={agree}
                    onChange={e => setAgree(e.target.checked)}
                    className="accent-[#bdeb6d] w-4 h-4"
                    required
                  />
                  <label htmlFor="terms" className="text-gray-300 text-sm">
                    I agree to the <a href="/terms" className="underline text-[#bdeb6d]">Terms & Conditions</a>
                  </label>
                </div>
                {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-2 rounded-md font-bold text-lg transition bg-[#bdeb6d] text-[#0d2329] hover:bg-[#a5d55f] disabled:opacity-60"
                >
                  {loading ? (mode === "signup" ? "Creating Account..." : "Logging in...") : (mode === "signup" ? "Create Account" : "Login")}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 