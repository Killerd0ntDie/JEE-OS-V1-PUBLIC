import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth';
import { Icon } from '@/components/ui/Icon';

export function AuthPage() {
  const { user, loading: authLoading, loginWithGoogle, loginWithEmail, registerWithEmail, resetPassword, loginGuest, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user) {
      const returnUrl = location.state?.returnUrl || '/dashboard';
      navigate(returnUrl, { replace: true });
    }
  }, [user, navigate, location]);

  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  if (user || authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
      </div>
    );
  }

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setValidationError('Please enter your email address.');
      return;
    }
    setIsLoading(true);
    clearError();
    setValidationError(null);
    try {
      await resetPassword(email);
      setResetSent(true);
    } catch (err) {
      // Error handled by AuthContext
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    clearError();
    setValidationError(null);

    if (!isLogin) {
      if (password.length < 6) {
        setValidationError('Password must be at least 6 characters long.');
        setIsLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setValidationError('Passwords do not match.');
        setIsLoading(false);
        return;
      }
    }

    try {
      if (isLogin) {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(email, password, name);
      }
    } catch (err) {
      // Error is handled by AuthContext
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    setIsLoading(true);
    clearError();
    try {
      await loginWithGoogle();
    } catch (err) {
      // Error is handled by AuthContext
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
      {/* Background aesthetics */}
      <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-white/[0.03] backdrop-blur-[40px] border border-white/[0.08] rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] p-8 relative z-10 animate-fade-in before:absolute before:inset-0 before:rounded-3xl before:bg-gradient-to-b before:from-white/5 before:to-transparent before:pointer-events-none">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 mb-4">
            <Icon name="Rocket" className="w-6 h-6 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-display font-bold text-white tracking-wide">JEE OS</h1>
          <p className="text-sm text-zinc-400 mt-2 font-mono">Mission Control for IIT</p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-950/30 border border-red-900/50 text-xs text-red-400 font-mono flex items-start gap-2">
            <Icon name="AlertCircle" className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{error.includes('auth/weak-password') ? 'Password is too weak. Please use a stronger password.' : error.includes('auth/invalid-credential') ? 'Invalid credentials. Please try again.' : error}</p>
          </div>
        )}

        {validationError && (
          <div className="mb-6 p-3 rounded-lg bg-red-950/30 border border-red-900/50 text-xs text-red-400 font-mono flex items-start gap-2">
            <Icon name="AlertCircle" className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{validationError}</p>
          </div>
        )}

        {isForgotPassword ? (
          resetSent ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 mx-auto flex items-center justify-center mb-4">
                <Icon name="Check" className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-lg font-bold text-white">Check Your Email</h2>
              <p className="text-sm text-zinc-400">
                We've sent password reset instructions to {email}.
              </p>
              <button 
                onClick={() => { setIsForgotPassword(false); setResetSent(false); }}
                className="w-full mt-6 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-sm py-2.5 rounded-lg transition-colors"
              >
                Return to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              <h2 className="text-lg font-bold text-white mb-2">Reset Password</h2>
              <p className="text-xs text-zinc-400 mb-4">
                Enter your email address and we'll send you a link to reset your password.
              </p>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5 ml-1 uppercase tracking-wider">Email Address</label>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 focus:bg-black/40 transition-all placeholder:text-zinc-600 shadow-inner"
                  placeholder="astronaut@jeeos.in"
                />
              </div>
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? <Icon name="Loader2" className="w-4 h-4 animate-spin" /> : null}
                Send Reset Link
              </button>
              <button 
                type="button"
                onClick={() => setIsForgotPassword(false)}
                className="w-full mt-2 bg-transparent hover:bg-white/5 text-zinc-400 text-sm py-2.5 rounded-lg transition-colors"
              >
                Back to Login
              </button>
            </form>
          )
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5 ml-1 uppercase tracking-wider">Full Name</label>
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 focus:bg-black/40 transition-all placeholder:text-zinc-600 shadow-inner"
                  placeholder="Aspirant Name"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5 ml-1 uppercase tracking-wider">Email Address</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 focus:bg-black/40 transition-all placeholder:text-zinc-600 shadow-inner"
                placeholder="astronaut@jeeos.in"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5 ml-1 pr-1">
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Password</label>
                {isLogin && (
                  <button 
                    type="button" 
                    onClick={() => setIsForgotPassword(true)}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 focus:bg-black/40 transition-all placeholder:text-zinc-600 shadow-inner pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-300 focus:outline-none"
                >
                  <Icon name={showPassword ? "EyeOff" : "Eye"} className="w-4 h-4" />
                </button>
              </div>
              {!isLogin && password && password.length < 6 && (
                <p className="text-xs text-amber-500 mt-1.5 ml-1 font-medium flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Minimum 6 characters required
                </p>
              )}
            </div>

            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5 ml-1 uppercase tracking-wider">Confirm Password</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 focus:bg-black/40 transition-all placeholder:text-zinc-600 shadow-inner pr-10 ${confirmPassword && password !== confirmPassword ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/50' : ''}`}
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? <Icon name="Loader2" className="w-4 h-4 animate-spin" /> : null}
              {isLogin ? 'Initialize Uplink' : 'Register Aspirant'}
            </button>
          </form>
        )}

        <div className="mt-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-zinc-800/60"></div>
          <span className="text-xs font-mono text-zinc-400 uppercase">OR</span>
          <div className="flex-1 h-px bg-zinc-800/60"></div>
        </div>

        <button 
          onClick={handleGoogle}
          disabled={isLoading}
          className="w-full mt-6 bg-white hover:bg-gray-100 text-zinc-900 font-semibold text-sm py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>

        <div className="mt-8 text-center space-y-3">
          <p className="text-xs text-zinc-400">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
            <button type="button" onClick={() => { setIsLogin(!isLogin); clearError(); setValidationError(null); setPassword(''); setConfirmPassword(''); }} className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
              {isLogin ? "Create one" : "Sign in"}
            </button>
          </p>
          <p className="text-xs text-zinc-600">
            <button onClick={loginGuest} className="hover:text-zinc-400 transition-colors underline decoration-zinc-700 underline-offset-4">
              Continue as Guest (Offline Sandbox)
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
