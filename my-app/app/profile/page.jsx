'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from 'lib/AuthContext';
import { updatePassword } from 'firebase/auth';
import axios from 'axios';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState({ username: '', Fullname: '' });
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Redirect unauthenticated users
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Fetch profile data
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

  // Handle profile update
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Basic validation
    if (!profile.username || profile.username.length < 3) {
      setError('Username must be at least 3 characters long.');
      setLoading(false);
      return;
    }
    if (!profile.Fullname || profile.Fullname.length < 2) {
      setError('Full name must be at least 2 characters long.');
      setLoading(false);
      return;
    }

    try {
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

  // Handle password change
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
      if (err.code === 'auth/requires-recent-login') {
        setError('Please log in again to change your password.');
      } else {
        setError(`Failed to update password: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return null; // Redirecting
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-white">
      <div className="w-full max-w-md text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Your Profile</h1>

        {/* Placeholder Avatar */}
        <div className="mb-6">
          <div className="w-24 h-24 mx-auto rounded-full overflow-hidden bg-gray-200">
            <div className="w-full h-full flex items-center justify-center text-gray-500">
              No Avatar
            </div>
          </div>
        </div>

        {/* Personal Info */}
        <form onSubmit={handleUpdateProfile} className="space-y-4 text-left">
          <div>
            <label className="block text-sm font-medium" htmlFor="Fullname">
              Full Name
            </label>
            <input
              id="Fullname"
              type="text" // Fixed from type="tel"
              placeholder="Enter your full name"
              value={profile.Fullname}
              onChange={(e) => setProfile({ ...profile, Fullname: e.target.value })}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Full name" // Fixed aria-label
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              type="text"
              placeholder="Enter your username"
              value={profile.username}
              onChange={(e) => setProfile({ ...profile, username: e.target.value })}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Username"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={user.email}
              className="w-full px-4 py-2 border rounded-md bg-gray-100 focus:outline-none"
              aria-label="Email address"
              disabled
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 font-medium mt-2"
            aria-label="Update profile"
          >
            {loading ? 'Updating...' : 'Update Profile'}
          </button>
        </form>

        {/* Security Settings */}
        <form onSubmit={handleChangePassword} className="space-y-4 text-left mt-8">
          <h2 className="text-xl font-semibold text-gray-900">Security Settings</h2>
          <div>
            <label className="block text-sm font-medium" htmlFor="newPassword">
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="New password"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 font-medium mt-2"
            aria-label="Change password"
          >
            {loading ? 'Changing...' : 'Change Password'}
          </button>
        </form>

        {/* Feedback Messages */}
        {success && (
          <p className="text-green-600 mt-4 text-sm" role="alert">
            {success}
          </p>
        )}
        {error && (
          <p className="text-red-500 mt-4 text-sm" role="alert">
            {error}
          </p>
        )}

        <p className="mt-4 text-sm text-gray-600">
          Back to{' '}
          <Link href="/games" className="underline text-yellow-500">
            Games
          </Link>.
        </p>
      </div>
    </div>
  );
}