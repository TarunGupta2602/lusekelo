'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function VendorLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile) {
      setError('Profile not found.');
      await supabase.auth.signOut();
      return;
    }

    if (profile.role !== 'vendor') {
      setError('Access denied. You are not a vendor.');
      await supabase.auth.signOut();
      return;
    }

    router.push('/vendor/dashboard');
  };

  return (
    <div className="max-w-md mx-auto mt-16 p-8 border rounded-xl shadow-lg bg-white">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-semibold text-blue-600">Vendor Login</h1>
        <p className="text-gray-600 mt-2">Welcome back! Please log in to your vendor account.</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-6">
        <div>
          <input
            type="email"
            placeholder="Email"
            className="w-full p-4 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-500 transition duration-200"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <input
            type="password"
            placeholder="Password"
            className="w-full p-4 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-500 transition duration-200"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && (
          <div className="text-red-600 text-sm font-medium">{error}</div>
        )}

        <div>
          <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium text-lg hover:bg-blue-700 focus:outline-none transition duration-300">
            Login
          </button>
        </div>


      </form>


    </div>
  );
}
