'use client';

import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth } from '../../lib/firebase';
import axios from 'axios';
import { useAuth } from '../../lib/AuthContext';

export default function LoginPage() {
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && user) {
      router.push('/profile'); 
    }
  }, [user, authLoading, router]);


  const handleLogin = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError(null);
  setSuccess(false);

  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    setError('Please enter a valid email address.');
    setLoading(false);
    return;
  }
  if (!password) {
    setError('Please enter a password.');
    setLoading(false);
    return;
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const res = await axios.get(`${apiUrl}/api/users/profile`, {
      headers: { Authorization: `Bearer ${await userCredential.user.getIdToken()}` },
    });

    if (![200, 201].includes(res.status)) {
      throw new Error(`Backend request failed: ${res.data?.message || 'Unknown error'}`);
    }

    setSuccess(true);
    setEmail('');
    setPassword('');
    } catch (err) {
      if (err.code?.startsWith('auth/')) {
        switch (err.code) {
          case 'auth/wrong-password':
            setError('Incorrect password.');
            break;
          case 'auth/user-not-found':
            setError('No account found with this email.');
            break;
          case 'auth/invalid-email':
            setError('Invalid email format.');
            break;
          case 'auth/too-many-requests':
            setError('Too many attempts. Please try again later.');
            break;
          default:
            setError(`Login failed: ${err.message}`);
        }
      } else {
        setError(`Error: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
};

  if (authLoading) {
    return <div>Loading...</div>;
  }

  if (user) {
    return null; 
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-white">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mx-auto"></div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900">Welcome Back!</h1>
        <p className="text-gray-500 mb-8">Log in to your account.</p>

        <div className="flex justify-center mb-6">
          <div className="flex border rounded-md w-full">
            <button
              className="w-1/2 py-2 text-white bg-blue-500 rounded-l-md font-semibold"
              disabled
            >
              Log In
            </button>
            <Link
              href="/register"
              className="w-1/2 py-2 text-gray-700 bg-gray-100 rounded-r-md text-center font-semibold hover:bg-gray-200"
            >
              Register
            </Link>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 text-left">
          <div>
            <label className="block text-sm font-medium" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              aria-label="Email address"
            />
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              aria-label="Password"
            />
          </div>

          <div className="flex justify-between items-center text-sm">
            <Link href="/forgot-password" className="text-yellow-500 hover:underline">
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 font-medium mt-2"
            aria-label={loading ? 'Logging in...' : 'Log In'}
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        {success && (
          <p className="text-green-600 mt-4 text-sm" role="alert">
            Login successful!
          </p>
        )}
        {error && (
          <p className="text-red-500 mt-4 text-sm" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}