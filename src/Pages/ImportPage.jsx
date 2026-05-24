import React, { useState, useRef } from 'react';
import { useDebts, formatCurrency, formatDate, getTodayDate } from '../contexts/DebtContext';

// Helper to parse CSV line properly (handles quotes with commas inside)
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export default function ImportPage() {
  const { debts, addDebt, addGroupRepayment, isOnline } = useDebts();
  const fileInputRef = useRef(null);
  
  const [importedPayments, setImportedPayments] = useState([]);
  const [importedDebts, setImportedDebts] = useState([]);
  const [matchedPayments, setMatchedPayments] = useState([]);
  const [matchedDebts, setMatchedDebts] = useState([]);
  const [selectedPaymentRows, setSelectedPaymentRows] = useState(new Set());
  const [selectedDebtRows, setSelectedDebtRows] = useState(new Set());
  const [toast, setToast] = useState('');
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState(1);
  const [activeTab, setActiveTab] = useState('payments');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 4000); };

  const handleFileUpload = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const text = event.target.result;
    console.log('=== RAW CSV (first 500 chars) ===');
    console.log(text.substring(0, 500));
    
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      showToast('⚠️ CSV file appears empty or invalid.');
      return;
    }

    const headerLine = lines[0];
    const headers = headerLine.split(',').map(h => h.trim().toLowerCase());
    console.log('=== HEADERS ===', headers);

    // Find column indexes
    const postingDateIdx = headers.findIndex(h => h.includes('posting date'));
    const descIdx = headers.findIndex(h => h === 'description');
    const originalDescIdx = headers.findIndex(h => h === 'original description');
    const moneyInIdx = headers.findIndex(h => h === 'money in');
    const moneyOutIdx = headers.findIndex(h => h === 'money out');
    const categoryIdx = headers.findIndex(h => h === 'category');
    const parentCategoryIdx = headers.findIndex(h => h === 'parent category');

    console.log('=== COLUMN INDEXES ===', { postingDateIdx, descIdx, moneyInIdx, moneyOutIdx });
    console.log('Headers:', headers);

    const payments = [];
    const debtsOut = [];
    
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      
      if (cols.length < 10) continue;
      
      const postingDate = cols[postingDateIdx]?.trim() || '';
      const description = cols[descIdx]?.trim() || '';
      const originalDesc = cols[originalDescIdx]?.trim() || '';
      const moneyInRaw = cols[moneyInIdx]?.trim() || '';
      const moneyOutRaw = cols[moneyOutIdx]?.trim() || '';
      const category = cols[categoryIdx]?.trim() || '';
      const parentCategory = cols[parentCategoryIdx]?.trim() || '';
      
      // Parse amounts - use absolute value
      const amountIn = moneyInRaw ? Math.abs(parseFloat(moneyInRaw.replace(/[^0-9.-]/g, ''))) : 0;
      const amountOut = moneyOutRaw ? Math.abs(parseFloat(moneyOutRaw.replace(/[^0-9.-]/g, ''))) : 0;
      
      const desc = description.toLowerCase();
      const cat = category.toLowerCase();
      const parentCat = parentCategory.toLowerCase();
      
      // Skip fees, interest, transfers, purchases
      if (desc.includes('fee') || cat.includes('fee') || parentCat.includes('fee') ||
          desc.includes('interest') || cat.includes('interest') ||
          desc.includes('online purchase') || desc.includes('card purchase') ||
          description === 'Transfer' || desc.includes('transfer to my savings') ||
          desc.includes('transfer to ya vhana') || desc.includes('transfer from my savings') ||
          desc.includes('transfer from ya vhana') || desc.includes('transfer received')) {
        continue;
      }

      // Format date
      let formattedDate = postingDate;
      if (postingDate && postingDate.includes('/')) {
        const parts = postingDate.split('/');
        if (parts.length === 3) {
          formattedDate = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
        }
      }

      // MONEY IN = Repayment received
      if (!isNaN(amountIn) && amountIn > 0 && desc.includes('payment received')) {
        console.log(`💰 Payment Row ${i}: ${description} = R${amountIn} (MoneyIn="${moneyInRaw}")`);
        payments.push({
          id: `pay-${i}`,
          date: formattedDate || postingDate,
          description: description,
          amount: amountIn,
          type: 'payment',
        });
      }
      
      // MONEY OUT = New debt given
      if (!isNaN(amountOut) && amountOut > 0) {
        const isPersonPayment = desc.includes('immediate payment') || 
                                desc.includes('external payment') ||
                                desc.includes('banking app');
        
        if (isPersonPayment) {
          let extractedName = originalDesc || '';
          const paymentMatch = description.match(/(?:Immediate Payment|External Payment|Banking App).*?:\s*(.+)/i);
          if (paymentMatch) {
            extractedName = paymentMatch[1].trim();
          }
          
          console.log(`💸 Debt Row ${i}: ${extractedName} = R${amountOut} (MoneyOut="${moneyOutRaw}")`);
          debtsOut.push({
            id: `debt-${i}`,
            date: formattedDate || postingDate,
            description: description,
            extractedName: extractedName,
            amount: amountOut,
            type: 'debt',
          });
        } else {
          console.log(`⏭️ Skipped MoneyOut Row ${i}: "${description}" (not a person payment)`);
        }
      }
    }

    console.log('=== PAYMENTS (Money In) ===', payments.length);
    console.log('=== DEBTS (Money Out) ===', debtsOut.length);
    
    setImportedPayments(payments);
    setImportedDebts(debtsOut);
    
    if (payments.length === 0 && debtsOut.length === 0) {
      showToast('⚠️ No valid transactions found. Check console for details.');
      return;
    }
    
    matchPayments(payments);
    matchDebts(debtsOut);
    setStep(2);
  };
  reader.readAsText(file);
};

  // Match payments (Money In) to existing debtors
  const matchPayments = (payments) => {
    const debtorMap = new Map();
    debts.forEach(d => {
      if (!d.paid) {
        const key = d.name.toLowerCase().trim();
        if (!debtorMap.has(key)) {
          debtorMap.set(key, { name: d.name, totalOwed: 0, debts: [] });
        }
        const entry = debtorMap.get(key);
        entry.totalOwed += d.returnAmountOwed;
        entry.debts.push(d);
      }
    });

    const matched = [];
    payments.forEach(trans => {
      let bestMatch = null;
      let bestScore = 0;
      const desc = trans.description.toLowerCase();
      
      let extractedName = '';
      const paymentReceived = desc.match(/payment received:\s*(.+)/i);
      const payShapReceived = desc.match(/payshap payment received:\s*(.+)/i);
      if (paymentReceived) extractedName = paymentReceived[1].trim();
      else if (payShapReceived) extractedName = payShapReceived[1].trim();

      debtorMap.forEach((debtor) => {
        let score = 0;
        if (extractedName) {
          const debtorParts = debtor.name.toLowerCase().split(' ');
          const extractedParts = extractedName.toLowerCase().split(' ');
          debtorParts.forEach(dp => {
            if (dp.length > 1) {
              extractedParts.forEach(ep => {
                if (ep.includes(dp) || dp.includes(ep)) score += 40;
              });
            }
          });
          if (debtor.name.toLowerCase() === extractedName.toLowerCase()) score += 100;
        }
        debtor.name.toLowerCase().split(' ').forEach(part => {
          if (part.length > 2 && desc.includes(part)) score += 20;
        });
        if (Math.abs(trans.amount - debtor.totalOwed) < 5) score += 20;

        if (score > bestScore) { bestScore = score; bestMatch = { ...debtor, score }; }
      });

      if (bestMatch && bestScore > 30) {
        matched.push({
          ...trans,
          matchedName: bestMatch.name,
          matchScore: Math.min(100, bestMatch.score),
          totalOwed: bestMatch.totalOwed,
          debtorDebts: bestMatch.debts,
        });
      }
    });

    setMatchedPayments(matched);
  };

  // Match debts (Money Out) - check against existing debtors
  const matchDebts = (debtsOut) => {
    const existingDebtors = new Map();
    debts.forEach(d => {
      const key = d.name.toLowerCase().trim();
      if (!existingDebtors.has(key)) {
        existingDebtors.set(key, { name: d.name, firestoreIds: [] });
      }
      existingDebtors.get(key).firestoreIds.push(d.firestoreId);
    });

    console.log('=== EXISTING DEBTORS ===', Array.from(existingDebtors.keys()));

    const matchedToExisting = new Map();
    const unmatched = [];

    debtsOut.forEach(d => {
      const extractedName = d.extractedName.toLowerCase().trim();
      let matchedName = null;

      if (existingDebtors.has(extractedName)) {
        matchedName = existingDebtors.get(extractedName).name;
      } else {
        existingDebtors.forEach((debtor, key) => {
          const debtorParts = debtor.name.toLowerCase().split(' ');
          const extractedParts = extractedName.split(' ');
          debtorParts.forEach(dp => {
            if (dp.length > 1) {
              extractedParts.forEach(ep => {
                if (ep.includes(dp) || dp.includes(ep)) {
                  matchedName = debtor.name;
                }
              });
            }
          });
        });
      }

      if (matchedName) {
        if (!matchedToExisting.has(matchedName.toLowerCase())) {
          matchedToExisting.set(matchedName.toLowerCase(), {
            name: matchedName,
            totalAmount: 0,
            transactions: [],
            isExisting: true,
            firestoreIds: existingDebtors.get(matchedName.toLowerCase())?.firestoreIds || [],
          });
        }
        const group = matchedToExisting.get(matchedName.toLowerCase());
        group.totalAmount += d.amount;
        group.transactions.push(d);
        console.log(`✅ Matched "${d.extractedName}" -> "${matchedName}" (existing debtor)`);
      } else {
        unmatched.push(d);
      }
    });

    const newDebtors = new Map();
    unmatched.forEach(d => {
      const key = d.extractedName.toLowerCase().trim();
      if (!newDebtors.has(key)) {
        newDebtors.set(key, { name: d.extractedName, totalAmount: 0, transactions: [], isExisting: false });
      }
      const g = newDebtors.get(key);
      g.totalAmount += d.amount;
      g.transactions.push(d);
      console.log(`🆕 New debtor: "${d.extractedName}"`);
    });

    const allMatched = [
      ...Array.from(matchedToExisting.values()),
      ...Array.from(newDebtors.values()),
    ].map(g => ({
      name: g.name,
      totalAmount: Math.round(g.totalAmount * 100) / 100,
      transactionCount: g.transactions.length,
      transactions: g.transactions,
      earliestDate: g.transactions.reduce((earliest, t) => 
        t.date < earliest ? t.date : earliest, g.transactions[0]?.date || ''
      ),
      isExisting: g.isExisting || false,
    }));

    console.log('=== MATCHED DEBTS ===', allMatched);
    setMatchedDebts(allMatched);
  };

  const togglePaymentRow = (id) => {
    const newSet = new Set(selectedPaymentRows);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedPaymentRows(newSet);
  };

  const toggleDebtRow = (name) => {
    const newSet = new Set(selectedDebtRows);
    if (newSet.has(name)) newSet.delete(name);
    else newSet.add(name);
    setSelectedDebtRows(newSet);
  };

  const selectAllPayments = () => {
    const newSet = new Set();
    matchedPayments.forEach(m => newSet.add(m.id));
    setSelectedPaymentRows(newSet);
  };

  const selectAllDebts = () => {
    const newSet = new Set();
    matchedDebts.forEach(m => newSet.add(m.name));
    setSelectedDebtRows(newSet);
  };

  const importPayments = async () => {
    if (selectedPaymentRows.size === 0) return { imported: 0, failed: 0 };
    let imported = 0;
    let failed = 0;
    
    for (const match of matchedPayments) {
      if (!selectedPaymentRows.has(match.id)) continue;
      try {
        const debtIds = match.debtorDebts.filter(d => !d.paid).map(d => d.firestoreId);
        if (debtIds.length > 0) {
          await addGroupRepayment(debtIds, Math.min(match.amount, match.totalOwed), match.date || getTodayDate());
          imported++;
          console.log(`✅ Imported payment: ${match.matchedName} - ${formatCurrency(match.amount)}`);
        } else { failed++; }
      } catch (err) { failed++; console.error(`❌ Failed payment: ${match.matchedName}`, err); }
    }
    return { imported, failed };
  };

  const importDebts = async () => {
    if (selectedDebtRows.size === 0) return { imported: 0, failed: 0 };
    let imported = 0;
    let failed = 0;
    
    for (const match of matchedDebts) {
      if (!selectedDebtRows.has(match.name)) continue;
      try {
        await addDebt({
          name: match.name,
          borrowedAmount: match.totalAmount,
          note: `Imported from bank statement (${match.transactionCount} transactions)${match.isExisting ? ' - Added to existing debtor' : ''}`,
          interestRate: 50,
          date: match.earliestDate || getTodayDate(),
          isCompound: false,
          dueDate: null,
          penaltyRate: 50,
        });
        imported++;
        console.log(`✅ Added debt: ${match.name} (${match.isExisting ? 'existing' : 'new'})`);
      } catch (err) { failed++; console.error(`❌ Failed: ${match.name}`, err); }
    }
    return { imported, failed };
  };

  const handleImportAll = async () => {
    const totalSelected = selectedPaymentRows.size + selectedDebtRows.size;
    if (totalSelected === 0) { showToast('⚠️ Select at least one transaction.'); return; }
    
    setImporting(true);
    
    const paymentResult = await importPayments();
    const debtResult = await importDebts();
    
    const totalImported = (paymentResult?.imported || 0) + (debtResult?.imported || 0);
    const totalFailed = (paymentResult?.failed || 0) + (debtResult?.failed || 0);
    
    setImporting(false);
    setStep(3);
    showToast(`✅ Imported ${totalImported} transactions. ${totalFailed > 0 ? `Failed: ${totalFailed}` : ''}`);
  };

  const handleReset = () => {
    setImportedPayments([]); setImportedDebts([]);
    setMatchedPayments([]); setMatchedDebts([]);
    setSelectedPaymentRows(new Set()); setSelectedDebtRows(new Set());
    setStep(1); setActiveTab('payments');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-amber-400">🏦 Import Bank Statement</h1>
        <span className={`flex items-center gap-2 text-sm ${isOnline ? 'text-emerald-400' : 'text-red-400'}`}>
          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
          {isOnline ? 'Synced' : 'Offline'}
        </span>
      </div>

      {toast && (
        <div className="bg-gray-900/90 backdrop-blur-xl border border-white/10 px-5 py-3 rounded-xl text-sm text-slate-100">{toast}</div>
      )}

      {/* Step Indicator */}
      <div className="flex items-center gap-4 justify-center">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step >= s ? 'bg-amber-500 text-gray-900' : 'bg-gray-800 text-slate-500'}`}>
              {step > s ? '✓' : s}
            </div>
            <span className={`text-xs font-semibold hidden sm:block ${step >= s ? 'text-slate-300' : 'text-slate-600'}`}>
              {s === 1 ? 'Upload' : s === 2 ? 'Review' : 'Complete'}
            </span>
            {s < 3 && <div className={`w-8 h-0.5 ${step > s ? 'bg-amber-500' : 'bg-gray-800'}`}></div>}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <div className="bg-gray-900/70 backdrop-blur-lg border border-white/5 rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-bold text-amber-400 mb-4">📁 Upload CSV File</h2>
          <p className="text-sm text-slate-400 mb-2">Upload your bank statement CSV file.</p>
          <p className="text-xs text-slate-500 mb-6">
            💰 <strong>Money In</strong> (Payment Received) = Repayments<br />
            💸 <strong>Money Out</strong> (Immediate/External Payment) = New Debts
          </p>
          
          <div className="border-2 border-dashed border-white/10 hover:border-amber-500/50 rounded-2xl p-10 text-center transition-all">
            <div className="text-5xl mb-4">📄</div>
            <p className="font-semibold mb-2 text-slate-300">Select your bank statement CSV</p>
            <p className="text-sm text-slate-500 mb-4">Comma-separated format supported</p>
            <input ref={fileInputRef} type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold rounded-xl transition-all duration-200">
              📂 Choose File
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Review */}
      {step === 2 && (
        <>
          {/* Tabs */}
          <div className="flex gap-3">
            <button
              onClick={() => setActiveTab('payments')}
              className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${activeTab === 'payments' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-gray-900/50 border border-white/5 text-slate-400 hover:bg-gray-900/70'}`}
            >
              💰 Repayments Received ({matchedPayments.length})
            </button>
            <button
              onClick={() => setActiveTab('debts')}
              className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${activeTab === 'debts' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-gray-900/50 border border-white/5 text-slate-400 hover:bg-gray-900/70'}`}
            >
              💸 Debts Given ({matchedDebts.length})
            </button>
          </div>

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <div className="bg-gray-900/70 backdrop-blur-lg border border-white/5 rounded-2xl p-6 shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-emerald-400">💰 Payments Received</h2>
                {matchedPayments.length > 0 && (
                  <button onClick={selectAllPayments} className="text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-slate-400 transition-all">
                    Select All
                  </button>
                )}
              </div>

              {matchedPayments.length === 0 ? (
                <p className="text-sm text-slate-500">No payment entries found to match.</p>
              ) : (
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-950/80 text-slate-400 text-xs uppercase tracking-wider sticky top-0">
                        <th className="p-3 text-left">☐</th>
                        <th className="p-3 text-left">Date</th>
                        <th className="p-3 text-left">Description</th>
                        <th className="p-3 text-left">Amount</th>
                        <th className="p-3 text-left">Matched To</th>
                        <th className="p-3 text-left">Match</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matchedPayments.map(m => (
                        <tr key={m.id} className={`border-b border-white/5 transition-colors cursor-pointer hover:bg-white/[0.02] ${selectedPaymentRows.has(m.id) ? 'bg-amber-500/10' : ''}`} onClick={() => togglePaymentRow(m.id)}>
                          <td className="p-3"><input type="checkbox" checked={selectedPaymentRows.has(m.id)} onChange={() => togglePaymentRow(m.id)} className="w-4 h-4 rounded accent-amber-500" /></td>
                          <td className="p-3 text-xs whitespace-nowrap">{formatDate(m.date) || m.date}</td>
                          <td className="p-3 text-xs max-w-[250px] truncate text-slate-300">{m.description}</td>
                          <td className="p-3 font-semibold text-emerald-400 whitespace-nowrap">{formatCurrency(m.amount)}</td>
                          <td className="p-3 font-medium text-slate-300 whitespace-nowrap">{m.matchedName}</td>
                          <td className="p-3">
                            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${m.matchScore > 60 ? 'bg-emerald-500/20 text-emerald-400' : m.matchScore > 30 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
                              {m.matchScore}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Debts Tab */}
          {activeTab === 'debts' && (
            <div className="bg-gray-900/70 backdrop-blur-lg border border-white/5 rounded-2xl p-6 shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-red-400">💸 Debts Given (Money Out)</h2>
                {matchedDebts.length > 0 && (
                  <button onClick={selectAllDebts} className="text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-slate-400 transition-all">
                    Select All
                  </button>
                )}
              </div>

              {matchedDebts.length === 0 ? (
                <p className="text-sm text-slate-500">No debt entries found.</p>
              ) : (
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-950/80 text-slate-400 text-xs uppercase tracking-wider sticky top-0">
                        <th className="p-3 text-left">☐</th>
                        <th className="p-3 text-left">Name</th>
                        <th className="p-3 text-left">Total Amount</th>
                        <th className="p-3 text-left">Transactions</th>
                        <th className="p-3 text-left">First Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matchedDebts.map(m => (
                        <tr key={m.name} className={`border-b border-white/5 transition-colors cursor-pointer hover:bg-white/[0.02] ${selectedDebtRows.has(m.name) ? 'bg-amber-500/10' : ''}`} onClick={() => toggleDebtRow(m.name)}>
                          <td className="p-3"><input type="checkbox" checked={selectedDebtRows.has(m.name)} onChange={() => toggleDebtRow(m.name)} className="w-4 h-4 rounded accent-amber-500" /></td>
                          <td className="p-3 font-medium text-slate-300">
                            {m.name}
                            {m.isExisting && (
                              <span className="ml-2 text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">Existing</span>
                            )}
                            {!m.isExisting && (
                              <span className="ml-2 text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">New</span>
                            )}
                          </td>
                          <td className="p-3 font-semibold text-red-400 whitespace-nowrap">{formatCurrency(m.totalAmount)}</td>
                          <td className="p-3 text-xs text-slate-400">{m.transactionCount} payments</td>
                          <td className="p-3 text-xs whitespace-nowrap">{formatDate(m.earliestDate) || m.earliestDate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button onClick={handleReset} className="flex-1 py-3 rounded-xl font-semibold border border-white/10 text-slate-400 hover:bg-white/5 transition-all">🔄 Start Over</button>
            <button
              onClick={handleImportAll}
              disabled={importing || (selectedPaymentRows.size === 0 && selectedDebtRows.size === 0)}
              className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-gray-900 font-bold rounded-xl transition-all duration-300 disabled:opacity-50"
            >
              {importing ? '⏳ Importing...' : `💾 Import (${selectedPaymentRows.size + selectedDebtRows.size} selected)`}
            </button>
          </div>
        </>
      )}

      {/* Step 3: Complete */}
      {step === 3 && (
        <div className="bg-gray-900/70 backdrop-blur-lg border border-white/5 rounded-2xl p-6 shadow-xl text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-xl font-bold text-amber-400 mb-2">Import Complete!</h2>
          <p className="text-slate-400 mb-6">Your transactions have been imported.</p>
          <div className="flex gap-3">
            <button onClick={handleReset} className="flex-1 py-3 rounded-xl font-semibold border border-white/10 text-slate-400 hover:bg-white/5 transition-all">📂 Import Another</button>
            <button onClick={() => window.location.href = '/'} className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-gray-900 font-bold rounded-xl transition-all">🏠 Go to Home</button>
          </div>
        </div>
      )}
    </div>
  );
}