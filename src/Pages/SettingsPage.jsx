import React, { useState, useEffect } from 'react';
import { useDebts } from '../contexts/DebtContext';

export default function SettingsPage() {
  const { interestRate, setInterestRate, debts } = useDebts();
  
  // Default Interest & Penalty
  const [localInterestRate, setLocalInterestRate] = useState(interestRate);
  const [localPenaltyRate, setLocalPenaltyRate] = useState(50);
  
  // Currency Settings
  const [currencySymbol, setCurrencySymbol] = useState('R');
  const [thousandSeparator, setThousandSeparator] = useState(' ');
  const [decimalSeparator, setDecimalSeparator] = useState('.');
  
  // Date Format
  const [dateFormat, setDateFormat] = useState('MMM DD, YYYY');
  
  // Categories
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#f59e0b');
  
  const [toast, setToast] = useState('');
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('financial');

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('appSettings') || '{}');
    if (saved.penaltyRate) setLocalPenaltyRate(saved.penaltyRate);
    if (saved.currencySymbol) setCurrencySymbol(saved.currencySymbol);
    if (saved.thousandSeparator) setThousandSeparator(saved.thousandSeparator);
    if (saved.decimalSeparator) setDecimalSeparator(saved.decimalSeparator);
    if (saved.dateFormat) setDateFormat(saved.dateFormat);
    if (saved.categories) setCategories(saved.categories);
  }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleSaveAll = () => {
    setSaving(true);
    try {
      setInterestRate(localInterestRate);
      const settings = {
        penaltyRate: localPenaltyRate,
        currencySymbol, thousandSeparator, decimalSeparator,
        dateFormat, categories,
      };
      localStorage.setItem('appSettings', JSON.stringify(settings));
      localStorage.setItem('defaultPenaltyRate', localPenaltyRate.toString());
      showToast('✅ All settings saved successfully!');
    } catch { showToast('❌ Failed to save settings.'); }
    setSaving(false);
  };

  const addCategory = () => {
    if (!newCategory.trim()) return;
    if (categories.find(c => c.name.toLowerCase() === newCategory.toLowerCase())) {
      showToast('⚠️ Category already exists.'); return;
    }
    setCategories([...categories, { name: newCategory.trim(), color: newCategoryColor }]);
    setNewCategory(''); setNewCategoryColor('#f59e0b');
  };

  const removeCategory = (index) => setCategories(categories.filter((_, i) => i !== index));

  const handleExportData = () => {
    const data = { debts, exportDate: new Date().toISOString(), version: '1.0' };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debt-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('📥 Data exported successfully!');
  };

  const inputClass = "w-full bg-gray-900/60 border border-white/10 rounded-xl px-4 py-3 text-slate-100 text-sm placeholder:text-slate-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all duration-200";
  const labelClass = "text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block";

  const tabClass = (tab) =>
    `flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all text-center ${
      activeTab === tab ? 'bg-amber-500 text-gray-900' : 'bg-transparent border border-white/10 text-slate-400 hover:bg-white/5'
    }`;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-amber-400">⚙️ Settings</h1>

      {toast && (
        <div className="bg-gray-900/90 backdrop-blur-xl border border-white/10 px-5 py-3 rounded-xl text-sm text-slate-100">{toast}</div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setActiveTab('financial')} className={tabClass('financial')}>💰 Financial</button>
        <button onClick={() => setActiveTab('display')} className={tabClass('display')}>🎨 Display</button>
        <button onClick={() => setActiveTab('categories')} className={tabClass('categories')}>🏷️ Categories</button>
        <button onClick={() => setActiveTab('export')} className={tabClass('export')}>📥 Export</button>
      </div>

      {/* Financial Settings */}
      {activeTab === 'financial' && (
        <div className="space-y-6">
          <div className="bg-gray-900/70 backdrop-blur-lg border border-white/5 rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-amber-400 mb-4">💰 Default Monthly Interest Rate</h2>
            <p className="text-sm text-slate-400 mb-4">Set the default monthly interest rate for new debts.</p>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className={labelClass}>Interest Rate (%)</label>
                <input type="number" min="0" step="0.1" value={localInterestRate} onChange={e => setLocalInterestRate(Number(e.target.value))} className={inputClass} />
              </div>
              <div className="flex-1">
                <label className={labelClass}>Example</label>
                <div className="bg-gray-950/50 rounded-xl px-4 py-3 text-sm text-slate-400">
                  {currencySymbol}100 → <span className="text-amber-400 font-bold">{currencySymbol}{100 * (1 + localInterestRate / 100)}</span> after 1 month
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-900/70 backdrop-blur-lg border border-white/5 rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-red-400 mb-4">⚠️ Default Late Payment Penalty</h2>
            <p className="text-sm text-slate-400 mb-4">Set the default monthly penalty rate for overdue debts.</p>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className={labelClass}>Penalty Rate (%)</label>
                <input type="number" min="0" step="0.1" value={localPenaltyRate} onChange={e => setLocalPenaltyRate(Number(e.target.value))} className={inputClass} />
              </div>
              <div className="flex-1">
                <label className={labelClass}>Example</label>
                <div className="bg-gray-950/50 rounded-xl px-4 py-3 text-sm text-slate-400">
                  {currencySymbol}150 → <span className="text-red-400 font-bold">+{currencySymbol}{150 * (localPenaltyRate / 100)}</span> per month late
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Display Settings */}
      {activeTab === 'display' && (
        <div className="space-y-6">
          <div className="bg-gray-900/70 backdrop-blur-lg border border-white/5 rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-amber-400 mb-4">💵 Currency Format</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className={labelClass}>Currency Symbol</label>
                <select value={currencySymbol} onChange={e => setCurrencySymbol(e.target.value)} className={inputClass}>
                  <option value="R">R (Rand)</option>
                  <option value="$">$ (Dollar)</option>
                  <option value="€">€ (Euro)</option>
                  <option value="£">£ (Pound)</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Thousand Separator</label>
                <select value={thousandSeparator} onChange={e => setThousandSeparator(e.target.value)} className={inputClass}>
                  <option value=" ">Space (1 000)</option>
                  <option value=",">Comma (1,000)</option>
                  <option value=".">Dot (1.000)</option>
                  <option value="">None (1000)</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Decimal Separator</label>
                <select value={decimalSeparator} onChange={e => setDecimalSeparator(e.target.value)} className={inputClass}>
                  <option value=".">Dot (1.50)</option>
                  <option value=",">Comma (1,50)</option>
                </select>
              </div>
            </div>
            <div className="bg-gray-950/50 rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-1">Preview</p>
              <p className="text-xl font-bold text-amber-400">{currencySymbol}1{thousandSeparator}234{decimalSeparator}56</p>
            </div>
          </div>

          <div className="bg-gray-900/70 backdrop-blur-lg border border-white/5 rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-amber-400 mb-4">📅 Date Format</h2>
            <div className="space-y-3">
              {[
                { value: 'MMM DD, YYYY', label: 'Apr 25, 2026' },
                { value: 'DD MMM YYYY', label: '25 Apr 2026' },
                { value: 'DD/MM/YYYY', label: '25/04/2026' },
                { value: 'MM/DD/YYYY', label: '04/25/2026' },
                { value: 'YYYY-MM-DD', label: '2026-04-25' },
                { value: 'DD Month YYYY', label: '25 April 2026' },
              ].map(format => (
                <label key={format.value} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${dateFormat === format.value ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-gray-950/30 border border-white/5 hover:bg-gray-950/50'}`}>
                  <input type="radio" name="dateFormat" value={format.value} checked={dateFormat === format.value} onChange={e => setDateFormat(e.target.value)} className="w-4 h-4 accent-amber-500" />
                  <span className="text-sm text-slate-300">{format.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Categories */}
      {activeTab === 'categories' && (
        <div className="bg-gray-900/70 backdrop-blur-lg border border-white/5 rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-bold text-amber-400 mb-4">🏷️ Custom Categories</h2>
          <p className="text-sm text-slate-400 mb-4">Create categories to organize your debtors.</p>
          <div className="flex gap-3 mb-6">
            <input type="text" placeholder="Category name" value={newCategory} onChange={e => setNewCategory(e.target.value)} className={inputClass} onKeyDown={e => e.key === 'Enter' && addCategory()} />
            <input type="color" value={newCategoryColor} onChange={e => setNewCategoryColor(e.target.value)} className="w-14 h-12 rounded-xl cursor-pointer border border-white/10 bg-gray-900/60" />
            <button onClick={addCategory} className="px-4 py-3 bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold rounded-xl transition-all whitespace-nowrap">➕ Add</button>
          </div>
          {categories.length === 0 ? (
            <p className="text-center py-8 text-slate-500">No categories yet.</p>
          ) : (
            <div className="space-y-2">
              {categories.map((cat, idx) => (
                <div key={idx} className="flex items-center justify-between bg-gray-950/50 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color }}></span>
                    <span className="text-sm text-slate-300">{cat.name}</span>
                  </div>
                  <button onClick={() => removeCategory(idx)} className="text-red-400 hover:text-red-300 text-xs">🗑 Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Export */}
      {activeTab === 'export' && (
        <div className="space-y-6">
          <div className="bg-gray-900/70 backdrop-blur-lg border border-white/5 rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-amber-400 mb-4">📥 Export Data</h2>
            <p className="text-sm text-slate-400 mb-6">Download all your debt data as a JSON file.</p>
            <div className="bg-gray-950/50 rounded-xl p-4 mb-6">
              <h3 className="text-sm font-semibold text-slate-300 mb-2">Export Includes:</h3>
              <ul className="text-xs text-slate-400 space-y-1">
                <li>• All debts ({debts.length} records)</li>
                <li>• Repayment history</li>
                <li>• Interest rates and penalties</li>
              </ul>
            </div>
            <button onClick={handleExportData} className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl transition-all">📥 Export All Data (JSON)</button>
          </div>
        </div>
      )}

      {/* Save Button */}
      <button
        onClick={handleSaveAll}
        disabled={saving}
        className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-gray-900 font-bold text-lg rounded-2xl shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all duration-300 disabled:opacity-50"
      >
        {saving ? 'Saving...' : '💾 Save All Settings'}
      </button>
    </div>
  );
}