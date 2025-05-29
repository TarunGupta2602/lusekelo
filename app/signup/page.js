"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import Image from "next/image";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showVerifyMessage, setShowVerifyMessage] = useState(false); // NEW
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

      // Do NOT upsert profile here! Wait until after email verification and login.
      setShowVerifyMessage(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Optionally, poll for verification and redirect
  // (Uncomment if you want auto-redirect after verification)
  /*
  useEffect(() => {
    let interval;
    if (showVerifyMessage) {
      interval = setInterval(async () => {
        const { data, error } = await supabase.auth.getUser();
        if (data?.user?.email_confirmed_at) {
          clearInterval(interval);
          router.push("/login");
        }
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [showVerifyMessage, router]);
  */

  const handleGoogleSignup = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
    });
    if (error) {
      console.error("Google signup error:", error.message);
      setError("Google signup failed.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-3xl font-semibold text-center mb-6">Create an Account</h1>
        {showVerifyMessage ? (
          <div className="text-center space-y-4">
            <Image src="/email-verification.svg" alt="Verify Email" width={80} height={80} className="mx-auto" />
            <h2 className="text-xl font-bold text-green-700">Verify your email</h2>
            <p className="text-gray-600">
              We’ve sent a verification link to <span className="font-semibold">{email}</span>.<br />
              Please check your inbox and verify your email to continue.
            </p>
            <button
              className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 transition"
              onClick={() => router.push("/login")}
            >
              Go to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSignup} className="space-y-6">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full Name"
              className="w-full px-4 py-2 border border-gray-300 rounded-md"
              required
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full px-4 py-2 border border-gray-300 rounded-md"
              required
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-2 border border-gray-300 rounded-md"
              required
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition"
            >
              {loading ? "Signing up..." : "Sign Up"}
            </button>
          </form>
        )}

        {!showVerifyMessage && (
          <>
            <div className="my-4 flex items-center gap-2 text-sm text-gray-500">
              <div className="flex-grow border-t" />
              OR
              <div className="flex-grow border-t" />
            </div>
            <button
              onClick={handleGoogleSignup}
              className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 py-2 rounded-md shadow-sm hover:bg-gray-100"
            >
              <Image
                src="/google-icon.svg"
                alt="Google"
                width={20}
                height={20}
                className="w-5 h-5"
              />
              Sign up with Google
            </button>
            <p className="mt-4 text-center text-sm text-gray-600">
              Already have an account?{" "}
              <a href="/login" className="text-blue-500 hover:underline">
                Log In
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
