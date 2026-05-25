import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DebtProvider } from './contexts/DebtContext';
import HomePage from './pages/HomePage';
import TotalsPage from './pages/TotalsPage';
import DashboardPage from './pages/DashboardPage';
import ImportPage from './pages/ImportPage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-4">⏳</div>
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" />;
  return children;
}

function AppContent() {
  const { user, logout, updateUserProfile, changePassword } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  
  // Change Password states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (user && !user.displayName) {
      setShowNamePrompt(true);
    }
  }, [user]);

  const linkClasses = ({ isActive }) =>
    `px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-200 ${
      isActive
        ? 'bg-amber-500 text-gray-900 shadow-lg shadow-amber-500/30'
        : 'text-slate-400 hover:text-amber-400 hover:bg-white/5'
    }`;

  const mobileLinkClasses = ({ isActive }) =>
    `block px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
      isActive
        ? 'bg-amber-500 text-gray-900'
        : 'text-slate-300 hover:text-amber-400 hover:bg-white/5'
    }`;

  const closeMobileMenu = () => setShowMobileMenu(false);

  return (
    <DebtProvider>
      <div className="min-h-screen bg-gray-950 text-slate-100">
        {user && (
          <nav className="sticky top-0 z-50 flex justify-between items-center gap-2 px-4 py-3 bg-gray-900/80 backdrop-blur-xl border-b border-white/5">
            {/* Desktop Nav Links */}
            <div className="hidden sm:flex items-center gap-1.5 flex-wrap">
              <NavLink to="/" end className={linkClasses}>🏠 Home</NavLink>
              <NavLink to="/totals" className={linkClasses}>📊 Totals</NavLink>
              <NavLink to="/dashboard" className={linkClasses}>📈 Dashboard</NavLink>
              <NavLink to="/import" className={linkClasses}>🏦 Import</NavLink>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="sm:hidden flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-200"
            >
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={showMobileMenu ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
              <span className="text-sm text-slate-300">Menu</span>
            </button>

            {/* User Section */}
<div className="flex items-center gap-1">
  <div className="relative">
    {/* User Button - Opens dropdown */}
    <button
      onClick={() => setShowUserMenu(!showUserMenu)}
      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-200"
      title="User menu"
    >
      <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-gray-900 font-bold text-xs">
        {user?.displayName?.[0] || user?.email?.[0] || '?'}
      </div>
      <span className="text-sm text-slate-300 hidden sm:block max-w-[120px] truncate">
        {user?.displayName || 'User'}
      </span>
      <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    {/* Dropdown Menu */}
    {showUserMenu && (
      <>
        <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)}></div>
        <div className="absolute right-0 mt-2 w-56 bg-gray-900 border border-white/10 rounded-2xl shadow-2xl z-50 py-2 animate-fade-in">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-gray-900 font-bold text-lg">
                {user?.displayName?.[0] || user?.email?.[0] || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-100 truncate">{user?.displayName || 'User'}</p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Edit Profile & Password */}
          <button
            onClick={() => {
              setShowUserMenu(false);
              setNewDisplayName(user?.displayName || '');
              setPasswordError('');
              setPasswordSuccess('');
              setCurrentPassword('');
              setNewPassword('');
              setConfirmPassword('');
              setShowEditProfile(true);
            }}
            className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 transition-all flex items-center gap-2"
          >
            <span>✏️</span> Edit Profile & Password
          </button>

          <div className="border-t border-white/5 mt-1 pt-1">
            <NavLink to="/settings" onClick={() => setShowUserMenu(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 transition-all">
              <span>⚙️</span> Settings
            </NavLink>
            <NavLink to="/profiles" onClick={() => setShowUserMenu(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 transition-all">
              <span>👤</span> Debtor Profiles
            </NavLink>
          </div>

          <div className="border-t border-white/5 mt-1 pt-1">
            <button onClick={() => { setShowUserMenu(false); logout(); }} className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-all flex items-center gap-2">
              <span>🚪</span> Logout
            </button>
          </div>
        </div>
      </>
    )}
  </div>
</div>
          </nav>
        )}

        {/* Mobile Dropdown Menu */}
        {showMobileMenu && user && (
          <>
            <div className="fixed inset-0 z-40 sm:hidden" onClick={closeMobileMenu}></div>
            <div className="fixed top-14 left-4 right-4 z-50 sm:hidden bg-gray-900 border border-white/10 rounded-2xl shadow-2xl p-3 animate-fade-in">
              <div className="space-y-1">
                <NavLink to="/" end onClick={closeMobileMenu} className={mobileLinkClasses}>🏠 Home</NavLink>
                <NavLink to="/totals" onClick={closeMobileMenu} className={mobileLinkClasses}>📊 Totals</NavLink>
                <NavLink to="/dashboard" onClick={closeMobileMenu} className={mobileLinkClasses}>📈 Dashboard</NavLink>
                <NavLink to="/import" onClick={closeMobileMenu} className={mobileLinkClasses}>🏦 Import</NavLink>
                <div className="border-t border-white/5 pt-2 mt-2">
                  <NavLink to="/settings" onClick={closeMobileMenu} className={mobileLinkClasses}>⚙️ Settings</NavLink>
                  <NavLink to="/profiles" onClick={closeMobileMenu} className={mobileLinkClasses}>👤 Debtor Profiles</NavLink>
                  <button onClick={() => { closeMobileMenu(); logout(); }} className="w-full text-left px-4 py-3 rounded-xl font-semibold text-sm text-red-400 hover:bg-red-500/10 transition-all">🚪 Logout</button>
                </div>
              </div>
            </div>
          </>
        )}

        <main className="max-w-4xl mx-auto px-4 py-8">
          <Routes>
            <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
            <Route path="/" element={<PrivateRoute><HomePage /></PrivateRoute>} />
            <Route path="/totals" element={<PrivateRoute><TotalsPage /></PrivateRoute>} />
            <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
            <Route path="/import" element={<PrivateRoute><ImportPage /></PrivateRoute>} />
            <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
            <Route path="/profiles" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
          </Routes>
        </main>

        {/* Combined Profile & Password Modal */}
        {showEditProfile && user && (
          <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" onClick={() => { setShowEditProfile(false); setPasswordError(''); setPasswordSuccess(''); }}></div>
            <div className="fixed inset-0 flex items-center justify-center z-[101] p-4">
              <div className="bg-gray-900 border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-amber-500 flex items-center justify-center text-gray-900 font-bold text-2xl mx-auto mb-3">
                    {user?.displayName?.[0] || user?.email?.[0] || '?'}
                  </div>
                  <h2 className="text-xl font-bold text-amber-400">{user?.displayName || 'User'}</h2>
                  <p className="text-slate-400 text-sm mt-1">{user?.email}</p>
                </div>

                {/* Edit Name */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-slate-300 mb-3">✏️ Display Name</h3>
                  <div className="flex gap-2">
                    <input type="text" value={newDisplayName} onChange={e => setNewDisplayName(e.target.value)} className="flex-1 bg-gray-900/60 border border-white/10 rounded-xl px-4 py-3 text-slate-100 text-sm outline-none focus:border-amber-500" />
                    <button onClick={async () => { if (!newDisplayName.trim()) return; try { await updateUserProfile(newDisplayName.trim()); } catch (err) { console.error('Failed:', err); } }} className="px-4 py-3 bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold rounded-xl transition-all text-sm">Save</button>
                  </div>
                </div>

                <div className="border-t border-white/5 my-4"></div>

                {/* Change Password */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-300 mb-3">🔒 Change Password</h3>
                  {passwordSuccess ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-emerald-400 text-sm text-center">✅ Password changed!</div>
                  ) : (
                    <form onSubmit={async (e) => { e.preventDefault(); setPasswordError(''); if (!currentPassword) { setPasswordError('Enter current password.'); return; } if (!newPassword || newPassword.length < 6) { setPasswordError('Min 6 characters.'); return; } if (newPassword !== confirmPassword) { setPasswordError('Passwords do not match.'); return; } setChangingPassword(true); try { await changePassword(currentPassword, newPassword); setPasswordSuccess('Password changed!'); } catch (err) { setPasswordError(err.message); } finally { setChangingPassword(false); } }} className="space-y-3">
                      {passwordError && <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2 text-red-400 text-xs">{passwordError}</div>}
                      <input type="password" placeholder="Current password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full bg-gray-900/60 border border-white/10 rounded-xl px-4 py-3 text-slate-100 text-sm outline-none focus:border-amber-500" required />
                      <input type="password" placeholder="New password (min 6 chars)" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-gray-900/60 border border-white/10 rounded-xl px-4 py-3 text-slate-100 text-sm outline-none focus:border-amber-500" required />
                      <input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full bg-gray-900/60 border border-white/10 rounded-xl px-4 py-3 text-slate-100 text-sm outline-none focus:border-amber-500" required />
                      <button type="submit" disabled={changingPassword} className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold rounded-xl transition-all text-sm disabled:opacity-50">{changingPassword ? 'Changing...' : 'Change Password'}</button>
                    </form>
                  )}
                </div>

                <button onClick={() => { setShowEditProfile(false); setPasswordError(''); setPasswordSuccess(''); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }} className="w-full mt-4 py-3 border border-white/10 text-slate-400 rounded-xl font-semibold hover:bg-white/5 transition-all">Close</button>
              </div>
            </div>
          </>
        )}

        {/* Name Prompt Modal (for users without names) */}
        {showNamePrompt && user && !user.displayName && (
          <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"></div>
            <div className="fixed inset-0 flex items-center justify-center z-[101] p-4">
              <div className="bg-gray-900 border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-fade-in">
                <div className="text-center mb-4">
                  <div className="text-4xl mb-2">👋</div>
                  <h2 className="text-xl font-bold text-amber-400">Welcome!</h2>
                  <p className="text-slate-400 text-sm mt-1">Please set your display name</p>
                </div>
                <form onSubmit={async (e) => { e.preventDefault(); if (!newDisplayName.trim()) return; try { await updateUserProfile(newDisplayName.trim()); setShowNamePrompt(false); } catch (err) { console.error('Failed:', err); } }} className="space-y-4">
                  <input type="text" placeholder="Enter your name" value={newDisplayName} onChange={e => setNewDisplayName(e.target.value)} className="w-full bg-gray-900/60 border border-white/10 rounded-xl px-4 py-3 text-slate-100 text-sm outline-none focus:border-amber-500" autoFocus required />
                  <button type="submit" className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold rounded-xl transition-all">💾 Save Name</button>
                </form>
              </div>
            </div>
          </>
        )}
      </div>
    </DebtProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}