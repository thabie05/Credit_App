import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [showReset, setShowReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const inputClass = "w-full bg-gray-900/60 border border-white/10 rounded-xl px-4 py-3 text-slate-100 text-sm placeholder:text-slate-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all duration-200";
  const labelClass = "text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSignUp) {
        if (!name.trim()) { setError('Please enter your name.'); setLoading(false); return; }
        await signUpWithEmail(email, password, name.trim());
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setError('');
    setLoading(true);
    try {
      await resetPassword(resetEmail.trim());
      console.log('✅ Password reset email sent to:', resetEmail);
      setResetSent(true);
    } catch (err) {
      console.error('❌ Reset failed:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md bg-gray-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">💰</div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-amber-300 via-amber-500 to-amber-600 bg-clip-text text-transparent">
            Debt Tracker
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            {isSignUp ? 'Create your account' : 'Sign in to your account'}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm mb-4">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className={labelClass}>Full Name</label>
              <input type="text" placeholder="John Smith" value={name} onChange={e => setName(e.target.value)} className={inputClass} autoComplete="name" />
            </div>
          )}
          <div>
            <label className={labelClass}>Email</label>
            <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} autoComplete="email" required />
          </div>
          <div>
            <label className={labelClass}>Password</label>
            <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className={inputClass} minLength={6} autoComplete={isSignUp ? 'new-password' : 'current-password'} required />
          </div>

          {!isSignUp && (
            <div className="text-right">
              <button type="button" onClick={() => { setShowReset(true); setResetEmail(email); setError(''); }} className="text-xs text-amber-400 hover:text-amber-300 transition-colors">
                Forgot password?
              </button>
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-gray-900 font-bold rounded-xl transition-all duration-300 disabled:opacity-50">
            {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="mt-4">
          <button onClick={signInWithGoogle} className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-100 font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
        </div>

        <p className="text-center text-slate-400 text-sm mt-6">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button onClick={() => { setIsSignUp(!isSignUp); setError(''); setName(''); }} className="text-amber-400 hover:text-amber-300 font-semibold">
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
      </div>

      {/* Reset Password Modal */}
      {showReset && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" onClick={() => setShowReset(false)}></div>
          <div className="fixed inset-0 flex items-center justify-center z-[101] p-4">
            <div className="bg-gray-900 border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
              <h2 className="text-lg font-bold text-amber-400 mb-4">Reset Password</h2>
              {resetSent ? (
                <div className="text-center">
                  <div className="text-4xl mb-3">📧</div>
                  <p className="text-slate-300 text-sm mb-4">Check your email for a password reset link.</p>
                  <button onClick={() => { setShowReset(false); setResetSent(false); }} className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold rounded-xl transition-all">Close</button>
                </div>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <p className="text-slate-400 text-sm">Enter your email to receive a password reset link.</p>
                  <input type="email" placeholder="you@example.com" value={resetEmail} onChange={e => setResetEmail(e.target.value)} className={inputClass} autoFocus required />
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setShowReset(false)} className="flex-1 py-3 border border-white/10 text-slate-400 rounded-xl font-semibold hover:bg-white/5 transition-all">Cancel</button>
                    <button type="submit" disabled={loading} className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold rounded-xl transition-all disabled:opacity-50">{loading ? 'Sending...' : 'Send Reset Link'}</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}