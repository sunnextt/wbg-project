'use client'

import { useState, useEffect } from 'react'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { auth } from '../../lib/firebase'
import axios from 'axios'
import { useAuth } from '../../lib/AuthContext'

export default function RegisterPage() {
  const { user, loading: authLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')

  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [redirectTimer, setRedirectTimer] = useState(5)
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && user) {
      router.push('/')
    }
  }, [user, authLoading, router])

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address.')
      setLoading(false)
      return
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.')
      setLoading(false)
      return
    }
    if (!displayName || displayName.length < 4) {
      setError('Name must be at least 4 characters long.')
      setLoading(false)
      return
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      await updateProfile(user, { displayName })

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const res = await axios.post(
        `${apiUrl}/api/users/profile`,
        {
          userId: user.uid,
          email: user.email,
          username: displayName,
        },
        {
          headers: { Authorization: `Bearer ${await user.getIdToken()}` },
        },
      )

      if (![200, 201].includes(res.status)) {
        throw new Error(`Backend request failed: ${res.data?.message || 'Unknown error'}`)
      }

      setSuccess(true)
      setEmail('')
      setPassword('')
      setDisplayName('')

      let timer = 5
      setRedirectTimer(timer)
      const countdown = setInterval(() => {
        timer -= 1
        setRedirectTimer(timer)
        if (timer === 0) {
          clearInterval(countdown)
          window.location.reload()
          router.push('/profile')
        }
      }, 1000)
    } catch (err) {
      if (err.code?.startsWith('auth/')) {
        switch (err.code) {
          case 'auth/email-already-in-use':
            setError('This email is already registered.')
            break
          case 'auth/weak-password':
            setError('Password is too weak. It must be at least 6 characters.')
            break
          case 'auth/invalid-email':
            setError('Invalid email format.')
            break
          default:
            setError(`Registration failed: ${err.message}`)
        }
      } else {
        setError(`Error: ${err.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return <div>Loading...</div>
  }

  if (user) {
    return null
  }

  return (
    <div className='min-h-screen flex flex-col items-center justify-center px-4 bg-white'>
      <div className='w-full max-w-md text-center'>
        <div className='mx-auto mb-6'>
          <div className='w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mx-auto'></div>
        </div>

        <h1 className='text-2xl font-bold text-gray-900'>Welcome!</h1>
        <p className='text-gray-500 mb-8'>Let's create your account.</p>

        <div className='flex justify-center mb-6'>
          <div className='flex border rounded-md w-full'>
            <Link
              href='/login'
              className='w-1/2 py-2 text-gray-700 bg-gray-100 rounded-l-md text-center font-semibold hover:bg-gray-200'
            >
              Log In
            </Link>
            <button className='w-1/2 py-2 text-white bg-blue-500 rounded-r-md font-semibold' disabled>
              Register
            </button>
          </div>
        </div>

        <form onSubmit={handleRegister} className='space-y-4 text-left'>
          <div>
            <label className='block text-sm font-medium' htmlFor='email'>
              Email Address
            </label>
            <input
              id='email'
              type='email'
              placeholder='Enter your email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className='w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
              required
              aria-label='Email address'
            />
          </div>
          <div>
            <label className='block text-sm font-medium' htmlFor='displayName'>
              Username
            </label>
            <input
              id='displayName'
              type='name'
              placeholder='Enter your display Name'
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className='w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
              required
              aria-label='displayName address'
            />
          </div>
          <div>
            <label className='block text-sm font-medium' htmlFor='password'>
              Password
            </label>
            <input
              id='password'
              type='password'
              placeholder='Create a strong password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className='w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
              required
              aria-label='Password'
            />
          </div>

          <button
            type='submit'
            disabled={loading}
            className='w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 font-medium mt-2'
            aria-label={loading ? 'Registering...' : 'Register'}
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        {success && (
          <p className='text-green-600 mt-4 text-sm' role='alert'>
            Registration successful!
          </p>
        )}
        {success && (
          <div className='text-green-600 mt-4 text-sm' role='alert'>
            Registration successful!
            {redirectTimer > 0 && <p>Redirecting to your profile in {redirectTimer} seconds...</p>}
          </div>
        )}

        {error && (
          <p className='text-red-500 mt-4 text-sm' role='alert'>
            {error}
          </p>
        )}

        <p className='mt-4 text-sm text-gray-600'>
          Already have an account?{' '}
          <Link href='/login' className='underline text-yellow-500'>
            Log in
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
