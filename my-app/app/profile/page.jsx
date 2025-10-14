'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from 'lib/AuthContext';
import { updatePassword } from 'firebase/auth';
import axios from 'axios';
import Link from 'next/link';
import { FaUserCircle } from 'react-icons/fa';

export default function ProfilePage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState({ username: '', Fullname: '' });
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && token) {
      const fetchProfile = async () => {
        setLoading(true);
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
          const res = await axios.get(`${apiUrl}/api/users/profile`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.status === 200) {
            setProfile({
              username: res.data.username || '',
              Fullname: res.data.Fullname || '',
            });
          }
        } catch (err) {
          setError(`Failed to fetch profile: ${err.message}`);
        } finally {
          setLoading(false);
        }
      };
      fetchProfile();
    }
  }, [user, token]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {

      if (!profile?.username || !profile?.Fullname) return

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await axios.put(`${apiUrl}/api/users/profile`, profile, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 200) {
        setSuccess('Profile updated successfully!');
      }
    } catch (err) {
      setError(`Failed to update profile: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    try {
      await updatePassword(user, newPassword);
      setSuccess('Password updated successfully!');
      setNewPassword('');
    } catch (err) {
      setError(
        err.code === 'auth/requires-recent-login'
          ? 'Please log in again to change your password.'
          : `Failed to update password: ${err.message}`
      );
    } finally {
      setLoading(false);
    }
  };

    if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-700">
        You are not login, go back to 
           <Link href="/" className="navbar-link hover:underline" aria-label="Home">
            Home
          </Link>
      </div>
    );
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-700">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 flex justify-center items-start">
      <div className="w-full max-w-2xl bg-white  rounded-xl p-6 space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-24 h-24 mx-auto rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-5xl">
            <FaUserCircle />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-800">Welcome, {profile.username || user.email}</h1>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>

        {/* Profile Update Form */}
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-700 border-b pb-2">📝 Profile Info</h2>
          <div>
            <label htmlFor="Fullname" className="block text-sm font-medium text-gray-700">
              Full Name
            </label>
            <input
              id="Fullname"
              type="text"
              value={profile.Fullname}
              onChange={(e) => setProfile({ ...profile, Fullname: e.target.value })}
              className="mt-1 w-full border px-3 py-2 rounded-md shadow-sm focus:ring focus:ring-blue-500 focus:outline-none"
              placeholder="Your full name"
              disabled={loading}
            />
          </div>
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={profile.username}
              onChange={(e) => setProfile({ ...profile, username: e.target.value })}
              className="mt-1 w-full border px-3 py-2 rounded-md shadow-sm focus:ring focus:ring-blue-500 focus:outline-none"
              placeholder="Your username"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md font-semibold transition"
          >
            {loading ? 'Updating...' : 'Update Profile'}
          </button>
        </form>

        {/* Password Change Form */}
        <form onSubmit={handleChangePassword} className="space-y-4 pt-4 border-t">
          <h2 className="text-lg font-semibold text-gray-700">🔐 Change Password</h2>
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 w-full border px-3 py-2 rounded-md shadow-sm focus:ring focus:ring-blue-500 focus:outline-none"
              placeholder="Enter new password"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-md font-semibold transition"
          >
            {loading ? 'Changing...' : 'Change Password'}
          </button>
        </form>

        {success && <p className="text-green-600 text-sm text-center">{success}</p>}
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <p className="text-sm text-gray-600 text-center mt-6">
          Back to{' '}
          <Link href="/games" className="text-blue-500 underline hover:text-blue-700">
            Games
          </Link>
        </p>
      </div>
    </div>
  );
}
