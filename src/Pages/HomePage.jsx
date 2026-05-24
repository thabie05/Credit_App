import React, { useState, useMemo } from 'react';
import { useDebts, calcReturn, formatCurrency, formatDate, getTodayDate, monthsBetween } from '../contexts/DebtContext';

function Toast({ message, onRemove }) {
  React.useEffect(() => {
    const timer = setTimeout(onRemove, 3000);
    return () => clearTimeout(timer);
  }, [onRemove]);
  return (
    <div className="bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl px-5 py-3.5 text-slate-100 font-medium text-sm shadow-2xl animate-slide-in max-w-sm">
      {message}
    </div>
  );
}

export default function HomePage() {
  const {
    debts, profiles, interestRate, isOnline, loaded,
    addDebt, addRepayment, addGroupRepayment, deleteDebt, clearAllPaid,
    addProfile, updateProfile, updateDebtorName,
  } = useDebts();

  const [toasts, setToasts] = useState([]);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newNote, setNewNote] = useState('');
  const [newDate, setNewDate] = useState(getTodayDate());
  const [showDebtForm, setShowDebtForm] = useState(false);
  const [debtInterestRate, setDebtInterestRate] = useState(interestRate);
  const [repayInputs, setRepayInputs] = useState({});
  const [saving, setSaving] = useState(false);
  const [isCompound, setIsCompound] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [penaltyRate, setPenaltyRate] = useState(50);
  const [historyVisible, setHistoryVisible] = useState({});
  const [quickAddInputs, setQuickAddInputs] = useState({});
  const [quickAddSaving, setQuickAddSaving] = useState({});
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', email: '', address: '', notes: '' });
  const [editingName, setEditingName] = useState(null);
  const [newDebtorName, setNewDebtorName] = useState('');

  if (!loaded) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-4 animate-bounce">💰</div>
        <p className="text-slate-400">Loading your debts...</p>
      </div>
    );
  }

  const groupedDebtors = useMemo(() => {
    const map = new Map();
    debts.forEach(debt => {
      const key = debt.name.toLowerCase().trim();
      if (!map.has(key)) {
        map.set(key, {
          displayName: debt.name, firestoreIds: [], individualDebts: [],
          totalBorrowed: 0, totalInterest: 0, totalReturnExpected: 0,
          totalRepaid: 0, totalRemaining: 0, allRepayments: [], isFullyPaid: true,
        });
      }
      const group = map.get(key);
      const months = monthsBetween(debt.date, getTodayDate());
      const fullReturn = calcReturn(debt.borrowedAmount, debt.interestRate, months, debt.isCompound);
      const interest = fullReturn - debt.borrowedAmount;
      const repaid = (debt.repayments || []).reduce((sum, r) => sum + r.amount, 0);

      let totalOwedWithPenalty = fullReturn;
      if (debt.dueDate && !debt.paid) {
        const dueDate = new Date(debt.dueDate + 'T00:00:00');
        const today = new Date(getTodayDate() + 'T00:00:00');
        if (today > dueDate) {
          const monthsLate = monthsBetween(debt.dueDate, getTodayDate());
          const penalty = fullReturn * (debt.penaltyRate / 100) * monthsLate;
          totalOwedWithPenalty += penalty;
        }
      }
      const debtRemaining = Math.max(0, totalOwedWithPenalty - repaid);

      group.firestoreIds.push(debt.firestoreId);
      group.individualDebts.push({
        firestoreId: debt.firestoreId, borrowedAmount: debt.borrowedAmount,
        interestRate: debt.interestRate, returnExpected: fullReturn,
        remaining: debtRemaining, repaid, date: debt.date, note: debt.note,
        paid: debt.paid, paidDate: debt.paidDate, repayments: debt.repayments || [],
        isCompound: debt.isCompound, dueDate: debt.dueDate, penaltyRate: debt.penaltyRate,
      });
      group.totalBorrowed += debt.borrowedAmount;
      group.totalInterest += interest;
      group.totalReturnExpected += fullReturn;
      group.totalRepaid += repaid;
      group.totalRemaining += debtRemaining;
      if (debtRemaining > 0) group.isFullyPaid = false;

      if (debt.repayments) {
        debt.repayments.forEach((r, idx) => {
          group.allRepayments.push({
            id: `${debt.firestoreId}-repay-${idx}`,
            amount: r.amount, date: r.date, debtId: debt.firestoreId,
            note: debt.note || '', repayIndex: idx,
            groupId: r.groupId || null, groupTotal: r.groupTotal || null,
          });
        });
      }
    });

    const result = Array.from(map.values()).map(group => ({
      ...group,
      allRepayments: group.allRepayments.sort((a, b) => new Date(b.date) - new Date(a.date)),
    }));

    return result.sort((a, b) => {
      if (a.isFullyPaid && !b.isFullyPaid) return 1;
      if (!a.isFullyPaid && b.isFullyPaid) return -1;
      return a.displayName.localeCompare(b.displayName);
    });
  }, [debts]);

  const totalBorrowed = groupedDebtors.reduce((s, g) => s + g.totalBorrowed, 0);
  const totalRemaining = groupedDebtors.reduce((s, g) => s + g.totalRemaining, 0);
  const totalCollected = groupedDebtors.reduce((s, g) => s + g.totalRepaid, 0);

  const addToast = (msg) => { const id = Date.now(); setToasts(prev => [...prev, { id, message: msg }]); };
  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));
  const toggleHistory = (groupKey) => setHistoryVisible(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));

  // ── Edit Name Functions ─────────────────────
  const handleEditName = (groupKey, currentName) => { setEditingName(groupKey); setNewDebtorName(currentName); };

  const handleSaveName = async (groupKey) => {
    if (!newDebtorName.trim()) { addToast('⚠️ Name cannot be empty.'); return; }
    const group = groupedDebtors.find(g => g.displayName.toLowerCase().trim() === groupKey);
    if (!group) return;
    if (newDebtorName.trim().toLowerCase() === group.displayName.toLowerCase()) { setEditingName(null); return; }
    try { await updateDebtorName(group.displayName, newDebtorName.trim()); addToast(`✅ Name updated to "${newDebtorName.trim()}".`); setEditingName(null); }
    catch { addToast('❌ Failed to update name.'); }
  };

  const handleCancelEdit = () => { setEditingName(null); setNewDebtorName(''); };

  // ── Profile Modal ───────────────────────────
  const openProfileModal = (groupName) => {
    const profile = profiles.find(p => p.name.toLowerCase() === groupName.toLowerCase());
    if (profile) { setSelectedProfile(profile); setProfileForm({ name: profile.name, phone: profile.phone || '', email: profile.email || '', address: profile.address || '', notes: profile.notes || '' }); }
    else { setSelectedProfile(null); setProfileForm({ name: groupName, phone: '', email: '', address: '', notes: '' }); }
    setEditingProfile(false); setShowProfileModal(true);
  };

  const handleSaveProfile = async () => {
    if (!profileForm.name.trim()) { addToast('⚠️ Name is required.'); return; }
    try { if (selectedProfile) { await updateProfile(selectedProfile.id, profileForm); addToast('✅ Profile updated.'); } else { await addProfile(profileForm); addToast('✅ Profile created.'); } setShowProfileModal(false); }
    catch { addToast('❌ Failed to save profile.'); }
  };

  const handleDeleteDebt = async (firestoreId, name) => { if (!window.confirm(`Delete this debt for "${name}"?`)) return; try { await deleteDebt(firestoreId); addToast('🗑 Debt deleted.'); } catch { addToast('❌ Failed.'); } };

  const handleDeleteRepayment = async (debtId, repayIndex, name) => {
    if (!window.confirm(`Delete this repayment of "${name}"?`)) return;
    const debt = debts.find(d => d.firestoreId === debtId);
    if (!debt) return;
    const updatedRepayments = debt.repayments.filter((_, i) => i !== repayIndex);
    const totalRepaid = updatedRepayments.reduce((sum, r) => sum + r.amount, 0);
    const months = monthsBetween(debt.date, getTodayDate());
    const fullReturn = calcReturn(debt.borrowedAmount, debt.interestRate, months, debt.isCompound);
    let totalOwedWithPenalty = fullReturn;
    if (debt.dueDate) { const dueDate = new Date(debt.dueDate + 'T00:00:00'); const today = new Date(getTodayDate() + 'T00:00:00'); if (today > dueDate) totalOwedWithPenalty += fullReturn * (debt.penaltyRate / 100) * monthsBetween(debt.dueDate, getTodayDate()); }
    const newReturnOwed = Math.max(0, Math.round((totalOwedWithPenalty - totalRepaid) * 100) / 100);
    const isPaid = newReturnOwed <= 0;
    try { const { updateDoc, doc } = await import('firebase/firestore'); const { db } = await import('../firebase'); await updateDoc(doc(db, 'debts', debtId), { repayments: updatedRepayments, returnAmountOwed: newReturnOwed, paid: isPaid, paidDate: isPaid ? null : debt.paidDate }); addToast('🗑 Repayment deleted.'); }
    catch { addToast('❌ Failed.'); }
  };

  const toggleQuickAdd = (groupKey) => setQuickAddInputs(prev => ({ ...prev, [groupKey]: { active: !prev[groupKey]?.active, amount: prev[groupKey]?.amount || '', interest: prev[groupKey]?.interest || interestRate, date: prev[groupKey]?.date || getTodayDate(), note: prev[groupKey]?.note || '', isCompound: prev[groupKey]?.isCompound || false, dueDate: prev[groupKey]?.dueDate || '', penalty: prev[groupKey]?.penalty || 50 } }));
  const handleQuickAddChange = (groupKey, field, value) => setQuickAddInputs(prev => ({ ...prev, [groupKey]: { ...prev[groupKey], [field]: value } }));

  const submitQuickAdd = async (groupKey, displayName) => {
    const input = quickAddInputs[groupKey];
    if (!input || !input.amount) { addToast('⚠️ Enter an amount.'); return; }
    const amount = parseFloat(input.amount);
    if (isNaN(amount) || amount <= 0) { addToast('⚠️ Enter a valid amount.'); return; }
    setQuickAddSaving(prev => ({ ...prev, [groupKey]: true }));
    try { await addDebt({ name: displayName, borrowedAmount: amount, note: input.note || '', interestRate: input.interest || interestRate, date: input.date || getTodayDate(), isCompound: input.isCompound || false, dueDate: input.dueDate || null, penaltyRate: input.penalty || 50 }); addToast(`✅ Added R${amount.toFixed(2)} to "${displayName}".`); setQuickAddInputs(prev => ({ ...prev, [groupKey]: { active: false, amount: '', interest: interestRate, date: getTodayDate(), note: '', isCompound: false, dueDate: '', penalty: 50 } })); }
    catch { addToast('❌ Failed.'); }
    finally { setQuickAddSaving(prev => ({ ...prev, [groupKey]: false })); }
  };

  const handleAddDebt = async () => {
    const name = newName.trim(); const amount = parseFloat(newAmount);
    if (!name || !newAmount || isNaN(amount) || amount <= 0) { addToast('⚠️ Fill name and valid amount.'); return; }
    setSaving(true);
    try { await addDebt({ name, borrowedAmount: amount, note: newNote.trim(), interestRate: debtInterestRate, date: newDate, isCompound, dueDate: dueDate || null, penaltyRate }); addToast(`✅ "${name}" added.`); setNewName(''); setNewAmount(''); setNewNote(''); setDebtInterestRate(interestRate); setNewDate(getTodayDate()); setIsCompound(false); setDueDate(''); setPenaltyRate(50); setShowDebtForm(false); }
    catch { addToast('❌ Failed.'); }
    finally { setSaving(false); }
  };

  const toggleRepayInput = (groupKey) => setRepayInputs(prev => ({ ...prev, [groupKey]: { active: !prev[groupKey]?.active, amount: prev[groupKey]?.amount || '', date: prev[groupKey]?.date || getTodayDate() } }));
  const handleRepayAmountChange = (groupKey, value) => setRepayInputs(prev => ({ ...prev, [groupKey]: { ...prev[groupKey], amount: value } }));
  const handleRepayDateChange = (groupKey, value) => setRepayInputs(prev => ({ ...prev, [groupKey]: { ...prev[groupKey], date: value } }));

  const submitRepayment = async (groupKey) => {
    const input = repayInputs[groupKey];
    if (!input || !input.amount) return;
    const amount = parseFloat(input.amount);
    if (isNaN(amount) || amount <= 0) { addToast('⚠️ Enter a valid amount.'); return; }
    const group = groupedDebtors.find(g => g.displayName.toLowerCase().trim() === groupKey);
    if (!group || group.isFullyPaid) return;
    if (amount > group.totalRemaining) { addToast(`⚠️ Amount too large. Total owed: ${formatCurrency(group.totalRemaining)}`); return; }
    try { const repaymentDate = input.date || getTodayDate(); const debtIds = group.individualDebts.filter(d => !d.paid && d.remaining > 0).map(d => d.firestoreId); await addGroupRepayment(debtIds, amount, repaymentDate); addToast(`💵 Repaid ${formatCurrency(amount)} on ${formatDate(repaymentDate)}.`); setRepayInputs(prev => ({ ...prev, [groupKey]: { active: false, amount: '', date: getTodayDate() } })); }
    catch { addToast('❌ Failed.'); }
  };

  const handleDeletePerson = async (group) => { if (!window.confirm(`Delete ALL debts for "${group.displayName}"?`)) return; try { for (const id of group.firestoreIds) await deleteDebt(id); addToast(`🗑 Deleted.`); } catch { addToast('❌ Failed.'); } };
  const handleClearPaid = async () => { const paid = groupedDebtors.filter(g => g.isFullyPaid); if (paid.length === 0) { addToast('ℹ️ No paid debtors.'); return; } if (!window.confirm(`Remove all ${paid.length} paid?`)) return; try { for (const g of paid) for (const id of g.firestoreIds) await deleteDebt(id); addToast(`🗑 Cleared.`); } catch { addToast('❌ Failed.'); } };

  const inputClass = "w-full bg-gray-900/60 border border-white/10 rounded-xl px-4 py-3 text-slate-100 text-sm placeholder:text-slate-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all duration-200";
  const labelClass = "text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block";
  const smallInputClass = "w-full bg-gray-950/70 border border-white/10 rounded-lg px-3 py-2 text-slate-100 text-xs placeholder:text-slate-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 outline-none transition-all duration-200";

  return (
    <div className="space-y-6">
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3">
        {toasts.map(t => <Toast key={t.id} message={t.message} onRemove={() => removeToast(t.id)} />)}
      </div>

      <div className="text-center pt-2 pb-4">
        <div className="text-5xl mb-2 drop-shadow-lg">💰</div>
        <h1 className="text-4xl font-extrabold bg-gradient-to-r from-amber-300 via-amber-500 to-amber-600 bg-clip-text text-transparent">Debt Tracker</h1>
        <p className="text-slate-400 text-sm mt-2 flex items-center justify-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 shadow-emerald-400' : 'bg-red-400 shadow-red-400'}`}></span>
          {isOnline ? 'Synced to cloud' : 'Offline'}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[{ label: 'Total Borrowed', value: totalBorrowed, color: 'text-red-400' }, { label: 'Still Owed', value: totalRemaining, color: 'text-amber-400' }, { label: 'Collected', value: totalCollected, color: 'text-emerald-400' }].map(card => (
          <div key={card.label} className="bg-gray-900/70 backdrop-blur-lg border border-white/5 rounded-2xl p-5 text-center hover:border-amber-500/30 hover:-translate-y-1 transition-all duration-300 shadow-xl">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{card.label}</div>
            <div className={`text-2xl font-bold ${card.color}`}>{formatCurrency(card.value)}</div>
          </div>
        ))}
      </div>

      <button onClick={() => setShowDebtForm(!showDebtForm)} disabled={saving} className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-gray-900 font-bold text-lg rounded-2xl shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all duration-300 disabled:opacity-50">
        {showDebtForm ? '✖ Close' : '➕ New Debt'}
      </button>

      {showDebtForm && (
        <div className="bg-gray-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl animate-fade-in">
          <h2 className="text-xl font-bold text-amber-400 mb-5">Add New Debtor</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1"><label className={labelClass}>Name *</label><input type="text" placeholder="e.g. John" value={newName} onChange={e => setNewName(e.target.value)} className={inputClass} autoFocus /></div>
            <div className="col-span-2 sm:col-span-1"><label className={labelClass}>Amount (R) *</label><input type="number" placeholder="100" min="1" step="0.01" value={newAmount} onChange={e => setNewAmount(e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>Monthly Interest (%)</label><input type="number" min="0" step="0.1" value={debtInterestRate} onChange={e => setDebtInterestRate(Number(e.target.value))} className={inputClass} /></div>
            <div><label className={labelClass}>Start Date</label><input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className={inputClass} /></div>
            <div className="col-span-2"><label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={isCompound} onChange={e => setIsCompound(e.target.checked)} className="w-5 h-5 rounded bg-gray-900/60 border-white/10 text-amber-500 focus:ring-amber-500" /><span className={labelClass}>Compound Interest</span></label></div>
            <div><label className={labelClass}>Due Date</label><input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>Late Penalty (%)</label><input type="number" min="0" step="0.1" value={penaltyRate} onChange={e => setPenaltyRate(Number(e.target.value))} className={inputClass} /></div>
            <div className="col-span-2"><label className={labelClass}>Note (optional)</label><textarea rows="2" placeholder="Optional" value={newNote} onChange={e => setNewNote(e.target.value)} className={inputClass} /></div>
            <button onClick={handleAddDebt} disabled={saving} className="col-span-2 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-gray-900 font-bold rounded-xl transition-all duration-300 disabled:opacity-50">{saving ? 'Saving...' : '➕ Add Debt'}</button>
          </div>
        </div>
      )}

      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">📋 Debtors <span className="bg-white/5 text-slate-400 text-xs px-3 py-1 rounded-full font-medium">{groupedDebtors.length} people ({groupedDebtors.filter(g => !g.isFullyPaid).length} owing)</span></h2>
          <button onClick={handleClearPaid} className="text-xs text-red-400 hover:text-red-300 border border-red-400/30 hover:border-red-400 px-3 py-1.5 rounded-lg transition-all duration-200">🗑 Clear Paid</button>
        </div>

        {groupedDebtors.length === 0 ? (
          <div className="text-center py-16 text-slate-500 bg-gray-900/40 rounded-3xl border-2 border-dashed border-white/5"><div className="text-6xl mb-4">📭</div><p>No debts yet.</p></div>
        ) : (
          <div className="space-y-4">
            {groupedDebtors.map(group => {
              const groupKey = group.displayName.toLowerCase().trim();
              const repayState = repayInputs[groupKey] || { active: false, amount: '', date: getTodayDate() };
              const quickAdd = quickAddInputs[groupKey] || { active: false, amount: '', interest: interestRate, date: getTodayDate(), note: '', isCompound: false, dueDate: '', penalty: 50 };
              const hasHistory = group.individualDebts.length > 0 || group.allRepayments.length > 0;

              return (
                <div key={groupKey} className={`bg-gray-900/70 backdrop-blur-lg border rounded-2xl p-5 shadow-xl transition-all duration-300 hover:-translate-y-1 ${group.isFullyPaid ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30'}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${group.isFullyPaid ? 'bg-emerald-400 shadow-emerald-400' : 'bg-red-400 shadow-red-400'}`}></span>
                        
                        {editingName === groupKey ? (
                          <div className="flex items-center gap-2">
                            <input type="text" value={newDebtorName} onChange={e => setNewDebtorName(e.target.value)} className="px-3 py-1.5 bg-gray-950/70 border border-amber-500/50 rounded-lg text-slate-100 text-sm font-bold outline-none focus:border-amber-500 w-40" autoFocus onKeyDown={e => { if (e.key === 'Enter') handleSaveName(groupKey); if (e.key === 'Escape') handleCancelEdit(); }} />
                            <button onClick={() => handleSaveName(groupKey)} className="text-emerald-400 hover:text-emerald-300 text-xs" title="Save">✓</button>
                            <button onClick={handleCancelEdit} className="text-red-400 hover:text-red-300 text-xs" title="Cancel">✕</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button onClick={() => openProfileModal(group.displayName)} className="font-bold text-lg text-left hover:text-amber-400 transition-colors duration-200" title="View/Edit Profile">{group.displayName}</button>
                            <button onClick={() => handleEditName(groupKey, group.displayName)} className="text-slate-600 hover:text-amber-400 text-xs transition-colors" title="Rename debtor">✏️</button>
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">{group.individualDebts.length} debt{group.individualDebts.length > 1 ? 's' : ''} · Interest: {formatCurrency(group.totalInterest)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-500">Borrowed: {formatCurrency(group.totalBorrowed)}</div>
                      <div className={`font-bold text-lg ${group.isFullyPaid ? 'text-emerald-400' : 'text-amber-400'}`}>{group.isFullyPaid ? `✅ Collected: ${formatCurrency(group.totalRepaid)}` : `Still owe: ${formatCurrency(group.totalRemaining)}`}</div>
                      {group.totalRepaid > 0 && <div className="text-xs text-blue-400">Repaid: {formatCurrency(group.totalRepaid)}</div>}
                    </div>
                  </div>

                  <div className="mb-3">
                    {quickAdd.active ? (
                      <div className="bg-gray-950/50 rounded-xl p-3 border border-amber-500/20">
                        <div className="text-xs font-semibold text-amber-400 mb-2">Quick Add Debt for {group.displayName}</div>
                        <div className="grid grid-cols-2 gap-2">
                          <input type="number" placeholder="Amount (R)" value={quickAdd.amount} onChange={e => handleQuickAddChange(groupKey, 'amount', e.target.value)} className={smallInputClass} />
                          <input type="number" placeholder="Monthly Interest (%)" value={quickAdd.interest} onChange={e => handleQuickAddChange(groupKey, 'interest', Number(e.target.value))} className={smallInputClass} />
                          <input type="date" value={quickAdd.date} onChange={e => handleQuickAddChange(groupKey, 'date', e.target.value)} className={smallInputClass} />
                          <input type="date" placeholder="Due date" value={quickAdd.dueDate} onChange={e => handleQuickAddChange(groupKey, 'dueDate', e.target.value)} className={smallInputClass} />
                          <label className="flex items-center gap-2 col-span-2"><input type="checkbox" checked={quickAdd.isCompound} onChange={e => handleQuickAddChange(groupKey, 'isCompound', e.target.checked)} className="w-4 h-4 rounded bg-gray-900/60 border-white/10 text-amber-500" /><span className="text-xs text-slate-400">Compound Interest</span></label>
                          <input type="text" placeholder="Note (optional)" value={quickAdd.note} onChange={e => handleQuickAddChange(groupKey, 'note', e.target.value)} className={`col-span-2 ${smallInputClass}`} />
                          <div className="col-span-2 flex gap-2">
                            <button onClick={() => toggleQuickAdd(groupKey)} className="flex-1 py-2 text-xs border border-white/10 text-slate-400 rounded-lg hover:bg-white/5 transition-all">Cancel</button>
                            <button onClick={() => submitQuickAdd(groupKey, group.displayName)} disabled={quickAddSaving[groupKey]} className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold text-xs rounded-lg transition-all disabled:opacity-50">{quickAddSaving[groupKey] ? 'Saving...' : '💾 Save Debt'}</button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => toggleQuickAdd(groupKey)} className="w-full py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-xs font-semibold rounded-lg transition-all duration-200">➕ Add Another Debt</button>
                    )}
                  </div>

                  {hasHistory && (
                    <div className="mb-3">
                      <button onClick={() => toggleHistory(groupKey)} className="w-full py-2 bg-gray-950/50 hover:bg-gray-950/70 border border-white/5 rounded-xl text-xs font-semibold text-amber-400 transition-all duration-200 flex items-center justify-center gap-2">
                        {historyVisible[groupKey] ? '🔼 Hide History' : (() => { const shownGroups = new Set(); let uniqueRepayments = 0; group.allRepayments.forEach(r => { if (r.groupId) { if (!shownGroups.has(r.groupId)) { shownGroups.add(r.groupId); uniqueRepayments++; } } else { uniqueRepayments++; } }); return `📜 Transaction History (${group.individualDebts.length + uniqueRepayments} entries)`; })()}
                      </button>
                      {historyVisible[groupKey] && (
                        <div className="bg-gray-950/50 rounded-xl p-4 mt-2 border border-white/5">
                          {group.individualDebts.map((d, idx) => (
                            <div key={d.firestoreId || idx} className="py-2 border-b border-white/3 last:border-0">
                              <div className="flex justify-between items-center mb-1">
                                <div className="flex items-center gap-2"><span className="text-[10px] font-bold bg-red-500/20 text-red-400 px-2 py-0.5 rounded uppercase tracking-wider">Debt</span><span className="text-xs text-slate-500">{formatDate(d.date)}</span></div>
                                <button onClick={() => handleDeleteDebt(d.firestoreId, group.displayName)} className="text-[10px] text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 py-0.5 rounded transition-all" title="Delete">Delete🗑</button>
                              </div>
                              <div className="text-xs text-slate-400 flex gap-3 flex-wrap"><span>Borrowed: {formatCurrency(d.borrowedAmount)}</span><span>@ {d.interestRate}% {d.isCompound ? '(compound)' : ''}</span><span>→ Return: {formatCurrency(d.returnExpected)}</span></div>
                              {d.note && <div className="text-xs text-slate-500 italic mt-1">📝 {d.note}</div>}
                              {d.paid && <div className="text-xs text-emerald-400 font-semibold mt-1">✅ Paid on {formatDate(d.paidDate)}</div>}
                              {!d.paid && d.remaining < d.returnExpected && <div className="text-xs text-amber-400 mt-1">Partially paid · Remaining: {formatCurrency(d.remaining)}</div>}
                              {d.dueDate && !d.paid && (<><div className="text-xs text-red-400 mt-1">⚠ Due: {formatDate(d.dueDate)}</div>{new Date(d.dueDate) < new Date() && (() => { const dueDt = new Date(d.dueDate + 'T00:00:00'); const today = new Date(); const diffMonths = Math.max(1, Math.floor((today - dueDt) / (1000 * 60 * 60 * 24 * 30))); const penaltyAmount = d.returnExpected * (d.penaltyRate / 100) * diffMonths; return (<div className="text-xs text-red-500 mt-0.5">💸 Penalty: {formatCurrency(penaltyAmount)} ({diffMonths} month{diffMonths > 1 ? 's' : ''} @ {d.penaltyRate}%)</div>); })()}</>)}
                            </div>
                          ))}
                          {(() => { const shownGroups = new Set(); const groupedRepayments = []; const standaloneRepayments = []; group.allRepayments.forEach(r => { if (r.groupId) { if (!shownGroups.has(r.groupId)) { shownGroups.add(r.groupId); groupedRepayments.push({ ...r, amount: r.groupTotal || r.amount, isGrouped: true, id: r.groupId }); } } else { standaloneRepayments.push(r); } }); const displayRepayments = [...groupedRepayments, ...standaloneRepayments]; displayRepayments.sort((a, b) => new Date(b.date) - new Date(a.date)); return displayRepayments.map((r) => (<div key={r.id} className="py-2 border-b border-white/3 last:border-0"><div className="flex justify-between items-center mb-1"><div className="flex items-center gap-2"><span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded uppercase tracking-wider">Repay</span><span className="text-xs text-slate-500">{formatDate(r.date)}</span>{r.isGrouped && (<span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">{group.individualDebts.filter(d => d.repayments.some(rp => rp.groupId === r.groupId)).length} debts</span>)}</div><button onClick={() => { if (r.isGrouped) { if (!window.confirm(`Delete this group repayment of ${formatCurrency(r.amount)}?`)) return; group.individualDebts.forEach(d => { d.repayments.forEach((rp, i) => { if (rp.groupId === r.groupId) { handleDeleteRepayment(d.firestoreId, i, group.displayName); } }); }); } else { handleDeleteRepayment(r.debtId, r.repayIndex, group.displayName); } }} className="text-[10px] text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 py-0.5 rounded transition-all" title="Delete">Delete🗑</button></div><div className="text-sm font-bold text-emerald-400">{formatCurrency(r.amount)}</div>{r.isGrouped && (<div className="text-[10px] text-slate-500 mt-0.5">Applied across {group.individualDebts.filter(d => d.repayments.some(rp => rp.groupId === r.groupId)).length} debts</div>)}</div>)); })()}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 justify-end flex-wrap items-center">
                    {!group.isFullyPaid && (<>{repayState.active && (<div className="flex items-center gap-2 flex-wrap w-full sm:w-auto"><input type="number" placeholder="Amount" value={repayState.amount} onChange={e => handleRepayAmountChange(groupKey, e.target.value)} className="w-24 px-3 py-2 bg-gray-950/70 border border-white/10 rounded-lg text-slate-100 text-xs outline-none focus:border-amber-500" /><input type="date" value={repayState.date} onChange={e => handleRepayDateChange(groupKey, e.target.value)} className="px-3 py-2 bg-gray-950/70 border border-white/10 rounded-lg text-slate-100 text-xs outline-none focus:border-amber-500" /><button onClick={() => submitRepayment(groupKey)} className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs rounded-lg transition-all">✓ Save</button></div>)}<button onClick={() => toggleRepayInput(groupKey)} className="px-3 py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 text-xs font-semibold rounded-lg transition-all whitespace-nowrap">{repayState.active ? 'Cancel' : '💰 Repay'}</button></>)}
                    <button onClick={() => handleDeletePerson(group)} className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold rounded-lg transition-all whitespace-nowrap">🗑 Delete All</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showProfileModal && (<><div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" onClick={() => setShowProfileModal(false)}></div><div className="fixed inset-0 flex items-center justify-center z-[101] p-4"><div className="bg-gray-900 border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto"><div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-amber-400">{editingProfile ? 'Edit Profile' : selectedProfile ? 'Debtor Profile' : 'Create Profile'}</h2><button onClick={() => setShowProfileModal(false)} className="text-slate-400 hover:text-white text-xl transition-colors">✕</button></div>{!editingProfile && selectedProfile ? (<div className="space-y-4"><div className="flex items-center gap-4 mb-4"><div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center text-3xl font-bold text-amber-400">{selectedProfile.name[0]?.toUpperCase()}</div><div><h3 className="text-lg font-bold">{selectedProfile.name}</h3><p className="text-xs text-slate-500">Debtor since {formatDate(selectedProfile.createdAt?.split('T')[0])}</p></div></div>{selectedProfile.phone && (<div className="flex items-center gap-3 p-3 bg-gray-950/50 rounded-xl"><span className="text-xl">📱</span><div><p className="text-xs text-slate-500">Phone</p><p className="text-sm font-semibold">{selectedProfile.phone}</p></div></div>)}{selectedProfile.email && (<div className="flex items-center gap-3 p-3 bg-gray-950/50 rounded-xl"><span className="text-xl">📧</span><div><p className="text-xs text-slate-500">Email</p><p className="text-sm font-semibold">{selectedProfile.email}</p></div></div>)}{selectedProfile.address && (<div className="flex items-center gap-3 p-3 bg-gray-950/50 rounded-xl"><span className="text-xl">📍</span><div><p className="text-xs text-slate-500">Address</p><p className="text-sm font-semibold">{selectedProfile.address}</p></div></div>)}{selectedProfile.notes && (<div className="p-3 bg-gray-950/50 rounded-xl"><p className="text-xs text-slate-500 mb-1">📝 Notes</p><p className="text-sm">{selectedProfile.notes}</p></div>)}<div className="flex gap-3"><button onClick={() => setShowProfileModal(false)} className="flex-1 py-3 border border-white/10 text-slate-400 rounded-xl font-semibold hover:bg-white/5 transition-all">Close</button><button onClick={() => setEditingProfile(true)} className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold rounded-xl transition-all">✏️ Edit</button></div></div>) : (<div className="space-y-4"><div><label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Name *</label><input type="text" value={profileForm.name} onChange={e => setProfileForm(prev => ({ ...prev, name: e.target.value }))} className="w-full bg-gray-900/60 border border-white/10 rounded-xl px-4 py-3 text-slate-100 text-sm outline-none focus:border-amber-500" /></div><div><label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Phone</label><input type="tel" value={profileForm.phone} onChange={e => setProfileForm(prev => ({ ...prev, phone: e.target.value }))} className="w-full bg-gray-900/60 border border-white/10 rounded-xl px-4 py-3 text-slate-100 text-sm outline-none focus:border-amber-500" /></div><div><label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Email</label><input type="email" value={profileForm.email} onChange={e => setProfileForm(prev => ({ ...prev, email: e.target.value }))} className="w-full bg-gray-900/60 border border-white/10 rounded-xl px-4 py-3 text-slate-100 text-sm outline-none focus:border-amber-500" /></div><div><label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Address</label><input type="text" value={profileForm.address} onChange={e => setProfileForm(prev => ({ ...prev, address: e.target.value }))} className="w-full bg-gray-900/60 border border-white/10 rounded-xl px-4 py-3 text-slate-100 text-sm outline-none focus:border-amber-500" /></div><div><label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Notes</label><textarea rows="3" value={profileForm.notes} onChange={e => setProfileForm(prev => ({ ...prev, notes: e.target.value }))} className="w-full bg-gray-900/60 border border-white/10 rounded-xl px-4 py-3 text-slate-100 text-sm outline-none focus:border-amber-500" /></div><div className="flex gap-3"><button onClick={() => { setEditingProfile(false); if (!selectedProfile) setShowProfileModal(false); }} className="flex-1 py-3 border border-white/10 text-slate-400 rounded-xl font-semibold hover:bg-white/5 transition-all">{selectedProfile ? 'Cancel Edit' : 'Cancel'}</button><button onClick={handleSaveProfile} className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-gray-900 font-bold rounded-xl hover:from-amber-400 hover:to-amber-500 transition-all">💾 Save</button></div></div>)}</div></div></>)}
    </div>
  );
}