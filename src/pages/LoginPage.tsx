import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, Shield, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

type Mode = 'login' | 'register' | 'admin' | 'forgot';

// Google Icon SVG Component
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const LoginPage: React.FC = () => {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { login, register, adminLogin, loginWithGoogle, resetPassword } = useAuth();
  const navigate = useNavigate();

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setShowPassword(false);
  };

  const switchMode = (newMode: Mode) => {
    resetForm();
    setMode(newMode);
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      toast.success('Welcome!');
      navigate('/');
    } catch (error: any) {
      console.error('Google login error:', error);
      if (error.code === 'auth/popup-closed-by-user') {
        toast.error('Sign-in popup was closed');
      } else if (error.code === 'auth/popup-blocked') {
        toast.error('Popup was blocked. Please allow popups.');
      } else {
        toast.error('Failed to sign in with Google');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Please enter your email address');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email);
      toast.success('Password reset email sent! Check your inbox.');
      setMode('login');
    } catch (error: any) {
      console.error('Reset password error:', error);
      if (error.code === 'auth/user-not-found') {
        toast.error('No account found with this email');
      } else if (error.code === 'auth/invalid-email') {
        toast.error('Invalid email address');
      } else {
        toast.error('Failed to send reset email');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'admin') {
        if (!email.trim() || !password.trim()) {
          toast.error('Please enter admin credentials');
          setLoading(false);
          return;
        }
        await adminLogin(email, password);
        toast.success('Welcome Admin!');
        navigate('/admin');
      } else if (mode === 'login') {
        await login(email, password);
        toast.success('Welcome back!');
        navigate('/');
      } else if (mode === 'register') {
        if (!name.trim()) {
          toast.error('Please enter your name');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          toast.error('Password must be at least 6 characters');
          setLoading(false);
          return;
        }
        await register(email, password, name);
        toast.success('Account created successfully!');
        navigate('/');
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      const code = error.code || '';
      if (code === 'auth/user-not-found') {
        toast.error('No account found. Please register first.');
      } else if (code === 'auth/wrong-password') {
        toast.error('Incorrect password');
      } else if (code === 'auth/email-already-in-use') {
        toast.error('Email already registered. Please login instead.');
      } else if (code === 'auth/weak-password') {
        toast.error('Password must be at least 6 characters');
      } else if (code === 'auth/invalid-email') {
        toast.error('Invalid email address');
      } else if (code === 'auth/invalid-credential') {
        toast.error('Invalid email or password');
      } else if (code === 'auth/too-many-requests') {
        toast.error('Too many attempts. Please try again later.');
      } else {
        toast.error(error.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password View
  if (mode === 'forgot') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-6">
              <img src="/images/logo.png" alt="SmartZone" className="h-12 w-12 object-contain rounded-xl" />
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">SmartZone</span>
            </Link>
            <h1 className="text-2xl font-bold text-gray-800">Reset Password</h1>
            <p className="text-gray-500 mt-1">Enter your email to receive a reset link</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="relative">
                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 text-sm"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
              >
                {loading ? (
                  <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span>
                ) : (
                  <>Send Reset Link <ArrowRight size={18} /></>
                )}
              </button>
            </form>

            <button
              onClick={() => switchMode('login')}
              className="w-full mt-4 py-2.5 text-gray-600 hover:text-gray-800 font-medium flex items-center justify-center gap-2 transition"
            >
              <ArrowLeft size={16} /> Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <img src="/images/logo.png" alt="SmartZone" className="h-12 w-12 object-contain rounded-xl" />
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">SmartZone</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">
            {mode === 'login' ? 'Welcome Back!' : mode === 'register' ? 'Create Account' : '🔒 Admin Login'}
          </h1>
          <p className="text-gray-500 mt-1">
            {mode === 'login'
              ? 'Sign in to your account to continue'
              : mode === 'register'
              ? 'Sign up to start shopping'
              : 'Access the admin dashboard'}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          {/* Mode Toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            <button
              onClick={() => switchMode('login')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition ${
                mode === 'login' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => switchMode('register')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition ${
                mode === 'register' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Register
            </button>
            <button
              onClick={() => switchMode('admin')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition ${
                mode === 'admin' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="flex items-center justify-center gap-1">
                <Shield size={14} /> Admin
              </span>
            </button>
          </div>

          {/* Admin info box - NO credentials shown */}
          {mode === 'admin' && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-5">
              <p className="text-sm text-orange-700 font-medium flex items-center gap-2">
                <Shield size={16} /> Admin Portal
              </p>
              <p className="text-xs text-orange-600 mt-1">
                Enter your admin credentials to access the dashboard.
              </p>
            </div>
          )}

          {/* Google Login - only for customer login/register */}
          {(mode === 'login' || mode === 'register') && (
            <>
              <button
                onClick={handleGoogleLogin}
                disabled={googleLoading}
                className="w-full py-3 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition flex items-center justify-center gap-3 mb-4 disabled:opacity-50"
              >
                {googleLoading ? (
                  <span className="animate-spin rounded-full h-5 w-5 border-2 border-gray-400 border-t-transparent"></span>
                ) : (
                  <>
                    <GoogleIcon />
                    <span className="text-gray-700">Continue with Google</span>
                  </>
                )}
              </button>

              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">or</span>
                </div>
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="relative">
                <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Full Name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 text-sm"
                  required
                />
              </div>
            )}

            <div className="relative">
              <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                placeholder={mode === 'admin' ? 'Admin Email' : 'Email Address'}
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 text-sm"
                required
              />
            </div>

            <div className="relative">
              <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={mode === 'admin' ? 'Admin Password' : 'Password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-11 pr-11 py-3 border border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 text-sm"
                required
                minLength={mode === 'register' ? 6 : 1}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Forgot Password Link */}
            {(mode === 'login' || mode === 'admin') && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg ${
                mode === 'admin'
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-orange-200 hover:from-orange-600 hover:to-red-600'
                  : 'bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700'
              }`}
            >
              {loading ? (
                <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span>
              ) : (
                <>
                  {mode === 'login' && <>Sign In <ArrowRight size={18} /></>}
                  {mode === 'register' && <>Create Account <ArrowRight size={18} /></>}
                  {mode === 'admin' && <><Shield size={18} /> Sign In as Admin</>}
                </>
              )}
            </button>
          </form>

          {/* Mode switch text */}
          <div className="mt-6 text-center">
            {mode === 'login' && (
              <p className="text-sm text-gray-500">
                Don't have an account?{' '}
                <button onClick={() => switchMode('register')} className="text-blue-600 font-semibold hover:underline">
                  Sign Up
                </button>
              </p>
            )}
            {mode === 'register' && (
              <p className="text-sm text-gray-500">
                Already have an account?{' '}
                <button onClick={() => switchMode('login')} className="text-blue-600 font-semibold hover:underline">
                  Sign In
                </button>
              </p>
            )}
            {mode === 'admin' && (
              <p className="text-sm text-gray-500">
                Not admin?{' '}
                <button onClick={() => switchMode('login')} className="text-blue-600 font-semibold hover:underline">
                  Customer Login
                </button>
              </p>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          By continuing, you agree to SmartZone's Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
