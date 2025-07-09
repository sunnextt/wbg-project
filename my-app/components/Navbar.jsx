'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from 'lib/firebase';
import 'styles/Navbar.css';
import { useAuth } from 'lib/AuthContext';

export default function Navbar() {
const [isOpen, setIsOpen] = useState(false);
  const { user, loading } = useAuth();
  const router = useRouter();

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading) return null;
  return (
    <nav className="navbar bg-blue-600 text-white p-4">
      <div className="navbar-container container mx-auto flex justify-between items-center">
        <Link href="/" className="navbar-logo flex items-center gap-2" aria-label="Arcade Nexus Home">
          <span className="logo-dot"></span>
          Arcade Nexus
        </Link>

        {/* Desktop Menu */}
        <div className="navbar-menu hidden md:flex space-x-4">
          <Link href="/" className="navbar-link hover:underline" aria-label="Home">
            Home
          </Link>
          <Link href="/games" className="navbar-link hover:underline" aria-label="Games">
            Games
          </Link>
          <Link href="/leaderboards" className="navbar-link hover:underline" aria-label="Leaderboards">
            Leaderboards
          </Link>
        </div>

        {/* Desktop Auth Links */}
        <div className="navbar-right hidden md:flex items-center gap-4">
          {user ? (
            <>
              <Link
                href="/profile"
                className="text-sm font-medium text-yellow-500 hover:underline"
                aria-label="Profile"
              >
                Profile
              </Link>
              <button
                onClick={handleLogout}
                className="text-sm font-medium bg-red-600 px-3 py-1 rounded-md hover:bg-red-700"
                aria-label="Log Out"
              >
                Log Out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-yellow-500 hover:underline"
                aria-label="Log In"
              >
                Log In
              </Link>
              <Link
                href="/register"
                className="text-sm font-medium text-yellow-500 hover:underline"
                aria-label="Register"
              >
                Register
              </Link>
            </>
          )}
        </div>

        {/* Hamburger Button for Mobile */}
        <button
          className="md:hidden focus:outline-none"
          onClick={toggleMenu}
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isOpen}
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={isOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
            />
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="navbar-mobile-menu md:hidden bg-blue-700 text-white flex flex-col items-center space-y-4 py-4">
          <Link
            href="/"
            className="navbar-link hover:underline"
            onClick={toggleMenu}
            aria-label="Home"
          >
            Home
          </Link>
          <Link
            href="/games"
            className="navbar-link hover:underline"
            onClick={toggleMenu}
            aria-label="Games"
          >
            Games
          </Link>
          <Link
            href="/leaderboards"
            className="navbar-link hover:underline"
            onClick={toggleMenu}
            aria-label="Leaderboards"
          >
            Leaderboards
          </Link>
          {user ? (
            <>
              <Link
                href="/profile"
                className="text-sm font-medium text-yellow-500 hover:underline"
                onClick={toggleMenu}
                aria-label="Profile"
              >
                Profile
              </Link>
              <button
                onClick={() => {
                  handleLogout();
                  toggleMenu();
                }}
                className="text-sm font-medium bg-red-600 px-3 py-1 rounded-md hover:bg-red-700"
                aria-label="Log Out"
              >
                Log Out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-yellow-500 hover:underline"
                onClick={toggleMenu}
                aria-label="Log In"
              >
                Log In
              </Link>
              <Link
                href="/register"
                className="text-sm font-medium text-yellow-500 hover:underline"
                onClick={toggleMenu}
                aria-label="Register"
              >
                Register
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}