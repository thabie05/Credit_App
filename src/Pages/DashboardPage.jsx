import React, { useMemo } from 'react';
import { useDebts, calcReturn, formatCurrency, monthsBetween, getTodayDate } from '../contexts/DebtContext';

function PieChart({ data }) {
  const filteredData = data.filter(item => item.value > 0);
  const total = filteredData.reduce((sum, item) => sum + item.value, 0);
  if (total === 0 || filteredData.length === 0) return <div className="flex items-center justify-center w-48 h-48"><p className="text-slate-500 text-sm">No data</p></div>;
  if (filteredData.length === 1) {
    return (
      <svg viewBox="0 0 200 200" className="w-48 h-48 drop-shadow-xl">
        <circle cx="100" cy="100" r="80" fill={filteredData[0].color} stroke="#0f172a" strokeWidth="2" />
        <circle cx="100" cy="100" r="45" fill="#1e293b" />
        <text x="100" y="97" textAnchor="middle" fill="#e2e8f0" fontSize="14" fontWeight="700">{filteredData[0].label === 'Collected' ? '100%' : '0%'}</text>
        <text x="100" y="113" textAnchor="middle" fill="#94a3b8" fontSize="8">Collected</text>
      </svg>
    );
  }
  let cumulativeAngle = 0;
  return (
    <svg viewBox="0 0 200 200" className="w-48 h-48 drop-shadow-xl">
      {filteredData.map((item, index) => {
        const sliceAngle = (item.value / total) * 360;
        const startAngle = cumulativeAngle;
        const endAngle = cumulativeAngle + sliceAngle;
        cumulativeAngle = endAngle;
        const startRad = ((startAngle - 90) * Math.PI) / 180;
        const endRad = ((endAngle - 90) * Math.PI) / 180;
        const r = 80, cx = 100, cy = 100;
        const x1 = cx + r * Math.cos(startRad), y1 = cy + r * Math.sin(startRad);
        const x2 = cx + r * Math.cos(endRad), y2 = cy + r * Math.sin(endRad);
        const largeArc = sliceAngle > 180 ? 1 : 0;
        return <path key={index} d={`M ${cx} ${cy} L ${x1.toFixed(4)} ${y1.toFixed(4)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(4)} ${y2.toFixed(4)} Z`} fill={item.color} stroke="#0f172a" strokeWidth="2" />;
      })}
      <circle cx="100" cy="100" r="45" fill="#1e293b" />
      <text x="100" y="97" textAnchor="middle" fill="#e2e8f0" fontSize="14" fontWeight="700">{total > 0 ? `${((data.find(d => d.label === 'Collected')?.value || 0) / (total || 1) * 100).toFixed(0)}%` : '0%'}</text>
      <text x="100" y="113" textAnchor="middle" fill="#94a3b8" fontSize="8">Collected</text>
    </svg>
  );
}

function BarChart({ data, height = 200 }) {
  if (!data || data.length === 0) return <p className="text-slate-500 text-center py-8 text-sm">No data</p>;
  const maxValue = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-1.5" style={{ height: `${height}px`, paddingBottom: '20px' }}>
      {data.map((item, idx) => {
        const barHeight = ((item.value / maxValue) * (height - 30));
        return (
          <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full min-w-[24px]">
            <span className="text-[10px] text-slate-400 mb-1 font-medium whitespace-nowrap">{formatCurrency(item.value)}</span>
            <div className="w-full rounded-t-md transition-all duration-500 hover:opacity-80" style={{ height: `${Math.max(3, barHeight)}px`, backgroundColor: item.color || '#f59e0b' }}></div>
            <span className="text-[9px] text-slate-400 mt-2 text-center leading-tight w-full overflow-hidden" style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap', minHeight: '16px' }} title={item.label}>{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function LineChart({ data, height = 220, color = '#f59e0b' }) {
  if (!data || data.length === 0) return <p className="text-slate-500 text-center py-8 text-sm">No data</p>;
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const width = 100, padding = 15, bottomPadding = 25;
  const chartH = height - padding - bottomPadding;
  const points = data.map((d, i) => {
    const x = padding + (i / Math.max(data.length - 1, 1)) * (width - padding * 2);
    const y = padding + chartH - (d.value / maxValue) * chartH;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div style={{ height: `${height}px` }}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
        {[0, 0.5, 1].map((pct, i) => {
          const y = padding + chartH - pct * chartH;
          return (
            <g key={i}>
              <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#334155" strokeWidth="0.3" />
              <text x={padding - 2} y={y + 3} fill="#64748b" fontSize="3.5" textAnchor="end">{pct === 1 ? maxValue.toFixed(0) : pct === 0.5 ? (maxValue / 2).toFixed(0) : '0'}</text>
            </g>
          );
        })}
        <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        {data.map((d, i) => {
          const x = padding + (i / Math.max(data.length - 1, 1)) * (width - padding * 2);
          const y = padding + chartH - (d.value / maxValue) * chartH;
          return <circle key={i} cx={x} cy={y} r="2.5" fill={color} />;
        })}
        {data.map((d, i) => {
          const x = padding + (i / Math.max(data.length - 1, 1)) * (width - padding * 2);
          return <text key={`t${i}`} x={x} y={height - 4} fill="#94a3b8" fontSize="4" textAnchor="middle" fontWeight="500">{d.label}</text>;
        })}
      </svg>
    </div>
  );
}

export default function DashboardPage() {
  const { debts, isOnline, loaded } = useDebts();

  if (!loaded) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-4 animate-bounce">📊</div>
        <p className="text-slate-400">Loading dashboard...</p>
      </div>
    );
  }

  const unpaid = debts.filter(d => !d.paid);
  const totalBorrowed = debts.reduce((s, d) => s + d.borrowedAmount, 0);
  
  const totalStillOwed = debts.reduce((s, d) => {
    if (d.paid) return s;
    const months = monthsBetween(d.date, getTodayDate());
    const fullReturn = calcReturn(d.borrowedAmount, d.interestRate, months, d.isCompound);
    const repaid = (d.repayments || []).reduce((sum, r) => sum + r.amount, 0);
    let totalOwedWithPenalty = fullReturn;
    if (d.dueDate && !d.paid) {
      const dueDate = new Date(d.dueDate + 'T00:00:00');
      const today = new Date(getTodayDate() + 'T00:00:00');
      if (today > dueDate) {
        const monthsLate = monthsBetween(d.dueDate, getTodayDate());
        totalOwedWithPenalty += fullReturn * (d.penaltyRate / 100) * monthsLate;
      }
    }
    return s + Math.max(0, totalOwedWithPenalty - repaid);
  }, 0);
  
  const totalCollected = debts.reduce((s, d) => s + (d.repayments || []).reduce((sum, r) => sum + r.amount, 0), 0);

  const pieData = [
    { label: 'Still Owed', value: totalStillOwed, color: '#f87171' },
    { label: 'Collected', value: totalCollected, color: '#34d399' },
  ];
  const pieTotal = totalStillOwed + totalCollected;

  const monthlyCollections = useMemo(() => {
    const months = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months[key] = { label: d.toLocaleDateString('en-US', { month: 'short' }), value: 0 };
    }
    debts.forEach(debt => {
      (debt.repayments || []).forEach(r => {
        const d = new Date(r.date + 'T00:00:00');
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (months[key]) months[key].value += r.amount;
      });
    });
    return Object.values(months).map(m => ({ label: m.label, value: Math.round(m.value * 100) / 100 }));
  }, [debts]);

  const topDebtors = useMemo(() => {
    const map = new Map();
    debts.forEach(debt => {
      const key = debt.name.toLowerCase().trim();
      const current = map.get(key) || { name: debt.name, value: 0 };
      current.value += debt.borrowedAmount;
      map.set(key, current);
    });
    const colors = ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#34d399', '#22d3ee', '#818cf8', '#e879f9'];
    return Array.from(map.values()).sort((a, b) => b.value - a.value).slice(0, 6).map((d, i) => ({ label: d.name.split(' ')[0], value: Math.round(d.value * 100) / 100, color: colors[i] }));
  }, [debts]);

  const repaymentRate = useMemo(() => {
    const months = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months[key] = { label: d.toLocaleDateString('en-US', { month: 'short' }), repaid: 0, due: 0 };
    }
    debts.forEach(debt => {
      (debt.repayments || []).forEach(r => {
        const d = new Date(r.date + 'T00:00:00');
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (months[key]) months[key].repaid += r.amount;
      });
      const dd = new Date(debt.date + 'T00:00:00');
      const key = `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, '0')}`;
      if (months[key]) months[key].due += debt.borrowedAmount * (1 + debt.interestRate / 100);
    });
    return Object.values(months).map(m => ({ label: m.label, value: m.due > 0 ? Math.round((m.repaid / m.due) * 100) : 0 }));
  }, [debts]);

  const maxDebtor = Math.max(...topDebtors.map(d => d.value), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-amber-400">📊 Dashboard</h1>
        <span className={`flex items-center gap-2 text-sm ${isOnline ? 'text-emerald-400' : 'text-red-400'}`}>
          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 shadow-emerald-400' : 'bg-red-400 shadow-red-400'}`}></span>
          {isOnline ? 'Synced' : 'Offline'}
        </span>
      </div>

      {debts.length === 0 ? (
        <div className="text-center py-20 text-slate-500 bg-gray-900/40 rounded-3xl border-2 border-dashed border-white/5">
          <div className="text-6xl mb-4">📊</div>
          <p className="text-lg">No data yet.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Debtors', value: debts.length },
              { label: 'Active', value: unpaid.length },
              { label: 'Still Owed', value: formatCurrency(totalStillOwed) },
              { label: 'Collected', value: formatCurrency(totalCollected) },
            ].map(stat => (
              <div key={stat.label} className="bg-gray-900/50 border border-white/5 rounded-xl p-4 text-center">
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">{stat.label}</div>
                <div className="text-lg font-bold text-slate-100">{stat.value}</div>
              </div>
            ))}
          </div>

          <div className="bg-gray-900/70 backdrop-blur-lg border border-white/5 rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-amber-400 mb-4">💰 Collection Overview</h2>
            <div className="flex flex-col sm:flex-row items-center gap-6 justify-center">
              <PieChart data={pieData} />
              <div className="space-y-3">
                {pieData.map(item => (
                  <div key={item.label} className="flex items-center gap-3">
                    <span className="w-4 h-4 rounded-md" style={{ backgroundColor: item.color }}></span>
                    <div>
                      <div className="text-sm text-slate-400">{item.label}</div>
                      <div className="text-lg font-bold text-slate-100">{formatCurrency(item.value)}{pieTotal > 0 && <span className="text-xs text-slate-500 ml-2">({((item.value / pieTotal) * 100).toFixed(1)}%)</span>}</div>
                    </div>
                  </div>
                ))}
                <div className="pt-3 border-t border-white/5"><div className="text-sm text-slate-400">Total</div><div className="text-xl font-bold text-amber-400">{formatCurrency(pieTotal)}</div></div>
              </div>
            </div>
          </div>

          <div className="bg-gray-900/70 backdrop-blur-lg border border-white/5 rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-amber-400 mb-4">📈 Monthly Collection Trends</h2>
            <LineChart data={monthlyCollections} height={220} color="#f59e0b" />
            <div className="flex gap-4 mt-3 text-xs text-slate-500">
              <span>Total: {formatCurrency(monthlyCollections.reduce((s, d) => s + d.value, 0))}</span>
              <span>Avg: {formatCurrency(monthlyCollections.reduce((s, d) => s + d.value, 0) / Math.max(monthlyCollections.length, 1))}/mo</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-900/70 backdrop-blur-lg border border-white/5 rounded-2xl p-6 shadow-xl">
              <h2 className="text-lg font-bold text-amber-400 mb-4">🏆 Top Debtors</h2>
              <BarChart data={topDebtors} height={200} />
            </div>
            <div className="bg-gray-900/70 backdrop-blur-lg border border-white/5 rounded-2xl p-6 shadow-xl">
              <h2 className="text-lg font-bold text-amber-400 mb-4">📉 Repayment Rate (%)</h2>
              <LineChart data={repaymentRate} height={220} color="#34d399" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}