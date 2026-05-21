import React, { useState, useMemo } from 'react';
import { useDebts, calcReturn, formatCurrency, formatDate, getTodayDate, monthsBetween } from '../contexts/DebtContext';

export default function TotalsPage() {
  const { debts, interestRate, addDebt, addRepayment, isOnline, loaded } = useDebts();
  const [type, setType] = useState('debt');
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newNote, setNewNote] = useState('');
  const [newDate, setNewDate] = useState(getTodayDate());
  const [selectedDebtor, setSelectedDebtor] = useState('');
  const [toast, setToast] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [debtInterestRate, setDebtInterestRate] = useState(interestRate);
  const [saving, setSaving] = useState(false);
  const [isCompound, setIsCompound] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [penaltyRate, setPenaltyRate] = useState(50);

  if (!loaded) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-4 animate-bounce">📊</div>
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  const unpaidRecords = debts.filter(d => !d.paid);

  const aggregated = useMemo(() => {
    const map = new Map();
    debts.forEach(debt => {
      const key = debt.name.toLowerCase().trim();
      if (!map.has(key)) {
        map.set(key, {
          displayName: debt.name,
          totalDebt: 0,
          totalInterest: 0,
          totalPenalty: 0,
          totalRepayment: 0,
          remainingBalance: 0,
          earliestDate: debt.date,
        });
      }
      const agg = map.get(key);
      const months = monthsBetween(debt.date, getTodayDate());
      const fullReturn = calcReturn(debt.borrowedAmount, debt.interestRate, months, debt.isCompound);
      const interest = fullReturn - debt.borrowedAmount;
      const totalRepaidFromArray = (debt.repayments || []).reduce((sum, r) => sum + r.amount, 0);

      // Calculate penalty
      let penalty = 0;
      if (debt.dueDate && !debt.paid) {
        const dueDate = new Date(debt.dueDate + 'T00:00:00');
        const today = new Date(getTodayDate() + 'T00:00:00');
        if (today > dueDate) {
          const monthsLate = monthsBetween(debt.dueDate, getTodayDate());
          penalty = fullReturn * (debt.penaltyRate / 100) * monthsLate;
        }
      }

      const totalOwedWithPenalty = fullReturn + penalty;
      const balance = Math.max(0, totalOwedWithPenalty - totalRepaidFromArray);

      agg.totalDebt += debt.borrowedAmount;
      agg.totalInterest += interest;
      agg.totalPenalty += penalty;
      agg.totalRepayment += totalRepaidFromArray;
      agg.remainingBalance += balance;

      if (debt.date < agg.earliestDate) agg.earliestDate = debt.date;
    });
    return Array.from(map.values()).sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [debts]);

  const totalDebt = aggregated.reduce((s, a) => s + a.totalDebt, 0);
  const totalInterest = aggregated.reduce((s, a) => s + a.totalInterest, 0);
  const totalPenalty = aggregated.reduce((s, a) => s + a.totalPenalty, 0);
  const totalRepayment = aggregated.reduce((s, a) => s + a.totalRepayment, 0);
  const totalRemaining = aggregated.reduce((s, a) => s + a.remainingBalance, 0);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };
  const inputClass = "w-full bg-gray-900/60 border border-white/10 rounded-xl px-4 py-3 text-slate-100 text-sm placeholder:text-slate-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all duration-200";

  const handleAdd = async () => {
    if (type === 'debt') {
      const name = newName.trim();
      const amount = parseFloat(newAmount);
      if (!name || !newAmount || isNaN(amount) || amount <= 0) { showToast('⚠️ Fill name and valid amount.'); return; }
      setSaving(true);
      try {
        await addDebt({ name, borrowedAmount: amount, note: newNote.trim(), interestRate: debtInterestRate, date: newDate, isCompound, dueDate: dueDate || null, penaltyRate });
        showToast('✅ Added.');
        setNewName(''); setNewAmount(''); setNewNote('');
        setDebtInterestRate(interestRate); setNewDate(getTodayDate());
        setIsCompound(false); setDueDate(''); setPenaltyRate(50);
        setShowForm(false);
      } catch { showToast('❌ Failed to add.'); }
      finally { setSaving(false); }
    } else {
      if (!selectedDebtor || !newAmount || isNaN(parseFloat(newAmount)) || parseFloat(newAmount) <= 0) { showToast('⚠️ Select debtor and valid amount.'); return; }
      const amount = parseFloat(newAmount);
      const debtor = debts.find(d => d.firestoreId === selectedDebtor);
      if (!debtor || amount > debtor.returnAmountOwed) { showToast('⚠️ Repayment too large.'); return; }
      try {
        await addRepayment(selectedDebtor, amount, getTodayDate());
        showToast('💵 Repaid.');
        setSelectedDebtor(''); setNewAmount('');
        setShowForm(false);
      } catch { showToast('❌ Failed to record repayment.'); }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-amber-400">📊 Detailed Totals</h1>
        <span className={`flex items-center gap-2 text-sm ${isOnline ? 'text-emerald-400' : 'text-red-400'}`}>
          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 shadow-emerald-400' : 'bg-red-400 shadow-red-400'}`}></span>
          {isOnline ? 'Synced' : 'Offline'}
        </span>
      </div>

      {toast && (<div className="bg-gray-900/90 backdrop-blur-xl border border-white/10 px-5 py-3 rounded-xl text-sm text-slate-100">{toast}</div>)}

      <button onClick={() => setShowForm(!showForm)} disabled={saving} className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-gray-900 font-bold rounded-xl shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all duration-300 disabled:opacity-50">
        {showForm ? '✖ Close' : '➕ Add Transaction'}
      </button>

      {showForm && (
        <div className="bg-gray-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 animate-fade-in">
          <div className="flex gap-3 mb-4">
            <button onClick={() => setType('debt')} className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all ${type === 'debt' ? 'bg-amber-500 text-gray-900' : 'bg-transparent border border-white/10 text-slate-400 hover:bg-white/5'}`}>New Debt</button>
            <button onClick={() => setType('repayment')} className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all ${type === 'repayment' ? 'bg-amber-500 text-gray-900' : 'bg-transparent border border-white/10 text-slate-400 hover:bg-white/5'}`}>Repayment</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {type === 'debt' ? (
              <>
                <input placeholder="Name" value={newName} onChange={e => setNewName(e.target.value)} className={inputClass} />
                <input type="number" placeholder="Amount" value={newAmount} onChange={e => setNewAmount(e.target.value)} className={inputClass} />
                <input type="number" placeholder="Monthly Interest (%)" value={debtInterestRate} onChange={e => setDebtInterestRate(Number(e.target.value))} className={inputClass} />
                <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className={inputClass} />
                <label className="flex items-center gap-2 col-span-2"><input type="checkbox" checked={isCompound} onChange={e => setIsCompound(e.target.checked)} className="w-4 h-4 rounded bg-gray-900/60 border-white/10 text-amber-500" /><span className="text-xs text-slate-400">Compound Interest</span></label>
                <input type="date" placeholder="Due date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputClass} />
                <input type="number" placeholder="Penalty (%)" value={penaltyRate} onChange={e => setPenaltyRate(Number(e.target.value))} className={inputClass} />
                <input placeholder="Note" value={newNote} onChange={e => setNewNote(e.target.value)} className={`col-span-2 ${inputClass}`} />
              </>
            ) : (
              <>
                <select value={selectedDebtor} onChange={e => setSelectedDebtor(e.target.value)} className={`col-span-2 ${inputClass}`}>
                  <option value="">-- Select Debtor --</option>
                  {unpaidRecords.map(d => (<option key={d.firestoreId} value={d.firestoreId}>{d.name} (owes {formatCurrency(d.returnAmountOwed)})</option>))}
                </select>
                <input type="number" placeholder="Repayment Amount" value={newAmount} onChange={e => setNewAmount(e.target.value)} className={inputClass} />
              </>
            )}
            <button onClick={handleAdd} disabled={saving} className="col-span-2 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-gray-900 font-bold rounded-xl transition-all duration-300 disabled:opacity-50">{saving ? 'Saving...' : '💾 Save'}</button>
          </div>
        </div>
      )}

      {/* Summary Cards - 5 columns */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total Debt', value: totalDebt, color: 'text-red-400' },
          { label: 'Interest', value: totalInterest, color: 'text-amber-400' },
          { label: 'Penalty', value: totalPenalty, color: 'text-red-500' },
          { label: 'Collected', value: totalRepayment, color: 'text-emerald-400' },
          { label: 'Remaining', value: totalRemaining, color: 'text-amber-300' },
        ].map(card => (
          <div key={card.label} className="bg-gray-900/70 backdrop-blur-lg border border-white/5 rounded-xl p-4 text-center hover:border-amber-500/20 transition-all duration-300">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">{card.label}</div>
            <div className={`text-lg font-bold ${card.color}`}>{formatCurrency(card.value)}</div>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-bold text-slate-100">All Debtors ({aggregated.length})</h2>

      {aggregated.length === 0 ? (
        <div className="text-center py-16 text-slate-500 bg-gray-900/40 rounded-3xl border-2 border-dashed border-white/5"><div className="text-6xl mb-4">📋</div><p>No debtors recorded.</p></div>
      ) : (
        <div className="bg-gray-900/70 backdrop-blur-lg border border-white/5 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-950/80 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="p-4 text-left font-semibold">Name</th>
                  <th className="p-4 text-left font-semibold">Total Debt</th>
                  <th className="p-4 text-left font-semibold">Interest</th>
                  <th className="p-4 text-left font-semibold">Penalty</th>
                  <th className="p-4 text-left font-semibold">Repayment</th>
                  <th className="p-4 text-left font-semibold">Balance</th>
                </tr>
              </thead>
              <tbody>
                {aggregated.map((agg, idx) => (
                  <tr key={idx} className={`border-b border-white/5 transition-colors duration-200 hover:bg-white/[0.02] ${agg.remainingBalance === 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    <td className="p-4 font-medium text-slate-100">{agg.displayName}</td>
                    <td className="p-4">{formatCurrency(agg.totalDebt)}</td>
                    <td className="p-4">{formatCurrency(agg.totalInterest)}</td>
                    <td className="p-4 text-red-500 font-medium">{formatCurrency(agg.totalPenalty)}</td>
                    <td className="p-4">{formatCurrency(agg.totalRepayment)}</td>
                    <td className="p-4 font-bold">{formatCurrency(agg.remainingBalance)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-950/80 font-bold text-amber-400 border-t-2 border-amber-500/30">
                  <td className="p-4">Total</td>
                  <td className="p-4">{formatCurrency(totalDebt)}</td>
                  <td className="p-4">{formatCurrency(totalInterest)}</td>
                  <td className="p-4 text-red-500">{formatCurrency(totalPenalty)}</td>
                  <td className="p-4">{formatCurrency(totalRepayment)}</td>
                  <td className="p-4">{formatCurrency(totalRemaining)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}