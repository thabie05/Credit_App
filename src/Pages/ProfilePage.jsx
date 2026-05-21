import React, { useState } from 'react';
import { useDebts, formatDate } from '../contexts/DebtContext';

export default function ProfilePage() {
  const { profiles, loaded, addProfile, updateProfile, deleteProfile } = useDebts();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [toast, setToast] = useState('');

  if (!loaded) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-4 animate-bounce">👤</div>
        <p className="text-slate-400">Loading profiles...</p>
      </div>
    );
  }

  const inputClass = "w-full bg-gray-900/60 border border-white/10 rounded-xl px-4 py-3 text-slate-100 text-sm placeholder:text-slate-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all duration-200";
  const labelClass = "text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block";

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const resetForm = () => {
    setName(''); setPhone(''); setEmail(''); setAddress(''); setNotes('');
    setEditingId(null); setShowForm(false);
  };

  const handleSave = async () => {
    if (!name.trim()) { showToast('⚠️ Name is required.'); return; }
    try {
      if (editingId) {
        await updateProfile(editingId, { name, phone, email, address, notes });
        showToast('✅ Profile updated.');
      } else {
        await addProfile({ name, phone, email, address, notes });
        showToast('✅ Profile created.');
      }
      resetForm();
    } catch { showToast('❌ Failed to save.'); }
  };

  const handleEdit = (profile) => {
    setName(profile.name);
    setPhone(profile.phone || '');
    setEmail(profile.email || '');
    setAddress(profile.address || '');
    setNotes(profile.notes || '');
    setEditingId(profile.id);
    setShowForm(true);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete profile for "${name}"?`)) return;
    try {
      await deleteProfile(id);
      showToast('🗑 Profile deleted.');
    } catch { showToast('❌ Failed to delete.'); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-amber-400">👤 Debtor Profiles</h1>

      {toast && (
        <div className="bg-gray-900/90 border border-white/10 px-5 py-3 rounded-xl text-sm">{toast}</div>
      )}

      <button
        onClick={() => { resetForm(); setShowForm(!showForm); }}
        className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-gray-900 font-bold rounded-xl transition-all duration-300"
      >
        {showForm ? '✖ Close' : '➕ Add Profile'}
      </button>

      {showForm && (
        <div className="bg-gray-900/80 border border-white/10 rounded-2xl p-5 space-y-4 animate-fade-in">
          <h2 className="text-lg font-bold text-amber-400">{editingId ? 'Edit Profile' : 'New Profile'}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelClass}>Name *</label>
              <input type="text" placeholder="Full name" value={name} onChange={e => setName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input type="tel" placeholder="+27..." value={phone} onChange={e => setPhone(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input type="email" placeholder="email@example.com" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Address</label>
              <input type="text" placeholder="Physical address" value={address} onChange={e => setAddress(e.target.value)} className={inputClass} />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Notes</label>
              <textarea rows="3" placeholder="Additional notes..." value={notes} onChange={e => setNotes(e.target.value)} className={inputClass} />
            </div>
            <button onClick={handleSave} className="col-span-2 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-gray-900 font-bold rounded-xl">
              {editingId ? '💾 Update' : '➕ Save Profile'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {profiles.length === 0 ? (
          <div className="text-center py-12 text-slate-500 bg-gray-900/40 rounded-2xl border border-dashed border-white/5">
            <div className="text-5xl mb-3">👤</div>
            <p>No profiles yet.</p>
          </div>
        ) : (
          profiles.map(profile => (
            <div key={profile.id} className="bg-gray-900/70 border border-white/5 rounded-2xl p-5 hover:border-amber-500/20 transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg">{profile.name}</h3>
                  {profile.phone && <p className="text-sm text-slate-400 mt-1">📱 {profile.phone}</p>}
                  {profile.email && <p className="text-sm text-slate-400">📧 {profile.email}</p>}
                  {profile.address && <p className="text-sm text-slate-400">📍 {profile.address}</p>}
                  {profile.notes && <p className="text-sm text-slate-500 mt-2 italic">📝 {profile.notes}</p>}
                  <p className="text-xs text-slate-600 mt-2">Created: {formatDate(profile.createdAt?.split('T')[0])}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(profile)} className="text-xs text-amber-400 hover:text-amber-300 px-2 py-1 border border-amber-400/30 rounded-lg transition-all">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(profile.id, profile.name)} className="text-xs text-red-400 hover:text-red-300 px-2 py-1 border border-red-400/30 rounded-lg transition-all">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}