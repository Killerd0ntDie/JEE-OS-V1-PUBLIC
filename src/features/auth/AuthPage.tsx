import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth';
import { Icon } from '@/components/ui/Icon';

export function AuthPage() {
  const { user, loginWithGoogle, loginWithEmail, registerWithEmail, loginGuest, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user) {
      const returnUrl = location.state?.returnUrl || '/dashboard';
      navigate(returnUrl, { replace: true });
    }
  }, [user, navigate, location]);

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    clearError();
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
            <p>{error}</p>
          </div>
        )}

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
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5 ml-1 uppercase tracking-wider">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 focus:bg-black/40 transition-all placeholder:text-zinc-600 shadow-inner"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? <Icon name="Loader2" className="w-4 h-4 animate-spin" /> : null}
            {isLogin ? 'Initialize Uplink' : 'Register Aspirant'}
          </button>
        </form>

        <div className="mt-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-zinc-800/60"></div>
          <span className="text-xs font-mono text-zinc-500 uppercase">OR</span>
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
          <p className="text-xs text-zinc-500">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
            <button onClick={() => { setIsLogin(!isLogin); clearError(); }} className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
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
