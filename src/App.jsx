import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DebtProvider, useDebts } from './contexts/DebtContext';
import HomePage from './pages/HomePage';
import TotalsPage from './pages/TotalsPage';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';

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
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const linkClasses = ({ isActive }) =>
    `px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-200 ${
      isActive
        ? 'bg-amber-500 text-gray-900 shadow-lg shadow-amber-500/30'
        : 'text-slate-400 hover:text-amber-400 hover:bg-white/5'
    }`;

  return (
    <DebtProvider>
      <div className="min-h-screen bg-gray-950 text-slate-100">
        {user && (
          <nav className="sticky top-0 z-50 flex justify-between items-center gap-2 px-4 py-3 bg-gray-900/80 backdrop-blur-xl border-b border-white/5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <NavLink to="/" end className={linkClasses}>🏠 Home</NavLink>
              <NavLink to="/totals" className={linkClasses}>📊 Totals</NavLink>
              <NavLink to="/dashboard" className={linkClasses}>📈 Dashboard</NavLink>
            </div>

            {/* User Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-200"
              >
                <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-gray-900 font-bold text-xs">
                  {user?.displayName?.[0] || user?.email?.[0] || '?'}
                </div>
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)}></div>
                  <div className="absolute right-0 mt-2 w-52 bg-gray-900 border border-white/10 rounded-2xl shadow-2xl z-50 py-2 animate-fade-in">
                    <div className="px-4 py-3 border-b border-white/5">
                      <p className="text-sm font-semibold text-slate-100 truncate">{user?.displayName || 'User'}</p>
                      <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                    </div>
                    <NavLink
                      to="/profiles"
                      onClick={() => setShowUserMenu(false)}
                      className="block px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 transition-all"
                    >
                      👤 Debtor Profiles
                    </NavLink>
                    <button
                      onClick={() => { setShowUserMenu(false); logout(); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-all"
                    >
                      🚪 Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </nav>
        )}

        <main className="max-w-4xl mx-auto px-4 py-8">
          <Routes>
            <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
            <Route path="/" element={<PrivateRoute><HomePage /></PrivateRoute>} />
            <Route path="/totals" element={<PrivateRoute><TotalsPage /></PrivateRoute>} />
            <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
            <Route path="/profiles" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
          </Routes>
        </main>
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