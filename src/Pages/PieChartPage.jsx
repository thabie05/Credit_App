import React from 'react';
import { useDebts, formatCurrency } from '../contexts/DebtContext';

function PieChart({ data }) {
  const filteredData = data.filter(item => item.value > 0);
  const total = filteredData.reduce((sum, item) => sum + item.value, 0);

  if (total === 0 || filteredData.length === 0) {
    return (
      <div className="flex items-center justify-center w-56 h-56">
        <div className="text-center text-slate-500">
          <div className="text-4xl mb-2">📊</div>
          <p className="text-sm">No data yet</p>
        </div>
      </div>
    );
  }

  if (filteredData.length === 1) {
    return (
      <svg viewBox="0 0 200 200" className="w-56 h-56 drop-shadow-2xl">
        <circle cx="100" cy="100" r="80" fill={filteredData[0].color} stroke="#0f172a" strokeWidth="2.5" />
        <circle cx="100" cy="100" r="45" fill="#0f172a" />
        <text x="100" y="97" textAnchor="middle" fill="#e2e8f0" fontSize="14" fontWeight="700">
          {filteredData[0].label === 'Collected' ? '100%' : '0%'}
        </text>
        <text x="100" y="113" textAnchor="middle" fill="#94a3b8" fontSize="8" fontWeight="500">
          Collected
        </text>
      </svg>
    );
  }

  let cumulativeAngle = 0;

  return (
    <svg viewBox="0 0 200 200" className="w-56 h-56 drop-shadow-2xl">
      {filteredData.map((item, index) => {
        const sliceAngle = (item.value / total) * 360;
        const startAngle = cumulativeAngle;
        const endAngle = cumulativeAngle + sliceAngle;
        cumulativeAngle = endAngle;

        const startRad = ((startAngle - 90) * Math.PI) / 180;
        const endRad = ((endAngle - 90) * Math.PI) / 180;
        const r = 80;
        const cx = 100;
        const cy = 100;

        const x1 = cx + r * Math.cos(startRad);
        const y1 = cy + r * Math.sin(startRad);
        const x2 = cx + r * Math.cos(endRad);
        const y2 = cy + r * Math.sin(endRad);

        const largeArc = sliceAngle > 180 ? 1 : 0;

        const pathData = [
          `M ${cx} ${cy}`,
          `L ${x1.toFixed(4)} ${y1.toFixed(4)}`,
          `A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(4)} ${y2.toFixed(4)}`,
          'Z',
        ].join(' ');

        return (
          <g key={index}>
            <path d={pathData} fill={item.color} stroke="#0f172a" strokeWidth="2.5" />
          </g>
        );
      })}
      <circle cx="100" cy="100" r="45" fill="#0f172a" />
      <text x="100" y="97" textAnchor="middle" fill="#e2e8f0" fontSize="14" fontWeight="700">
        {total > 0 && data.some(d => d.label === 'Collected')
          ? `${((data.find(d => d.label === 'Collected')?.value || 0) / (data.reduce((s, d) => s + d.value, 0) || 1) * 100).toFixed(0)}%`
          : '0%'}
      </text>
      <text x="100" y="113" textAnchor="middle" fill="#94a3b8" fontSize="8" fontWeight="500">
        Collected
      </text>
    </svg>
  );
}

export default function PieChartPage() {
  const { debts, isOnline, loaded } = useDebts();

  if (!loaded) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-4 animate-bounce">📊</div>
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  const unpaid = debts.filter(d => !d.paid);
  const totalStillOwed = unpaid.reduce((s, d) => s + d.returnAmountOwed, 0);

  // Calculate total collected from repayments array
  const totalCollected = debts.reduce((s, d) => {
    const repaid = (d.repayments || []).reduce((sum, r) => sum + r.amount, 0);
    return s + repaid;
  }, 0);

  const pieData = [
    { label: 'Still Owed', value: totalStillOwed, color: '#f87171' },
    { label: 'Collected', value: totalCollected, color: '#34d399' },
  ];

  const total = totalStillOwed + totalCollected;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-amber-400">📈 Debt Overview</h1>
        <span className={`flex items-center gap-2 text-sm ${isOnline ? 'text-emerald-400' : 'text-red-400'}`}>
          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 shadow-emerald-400' : 'bg-red-400 shadow-red-400'}`}></span>
          {isOnline ? 'Synced' : 'Offline'}
        </span>
      </div>

      {debts.length === 0 ? (
        <div className="text-center py-16 text-slate-500 bg-gray-900/40 rounded-3xl border-2 border-dashed border-white/5">
          <div className="text-6xl mb-4">📊</div>
          <p className="text-lg">No debt data yet.</p>
          <p className="text-sm mt-1">Add debtors on the Home page to see the chart.</p>
        </div>
      ) : (
        <div className="bg-gray-900/70 backdrop-blur-lg border border-white/5 rounded-3xl p-8 shadow-2xl">
          <div className="flex flex-col md:flex-row items-center gap-8 justify-center">
            <PieChart data={pieData} />

            <div className="space-y-4">
              {pieData.map(item => (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-lg shadow-lg" style={{ backgroundColor: item.color }}></span>
                  <div>
                    <div className="text-sm text-slate-400">{item.label}</div>
                    <div className="text-xl font-bold text-slate-100">
                      {formatCurrency(item.value)}
                      {total > 0 && (
                        <span className="text-sm text-slate-500 ml-2">
                          ({((item.value / total) * 100).toFixed(1)}%)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div className="pt-4 mt-4 border-t border-white/5">
                <div className="text-sm text-slate-400">Total</div>
                <div className="text-2xl font-bold text-amber-400">{formatCurrency(total)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {debts.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Debtors', value: debts.length },
            { label: 'Unpaid', value: unpaid.length },
            { label: 'Fully Paid', value: debts.filter(d => d.paid).length },
            {
              label: 'Avg Interest',
              value: `${(debts.reduce((s, d) => s + d.interestRate, 0) / debts.length).toFixed(0)}%`,
            },
          ].map(stat => (
            <div key={stat.label} className="bg-gray-900/50 border border-white/5 rounded-xl p-4 text-center">
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">{stat.label}</div>
              <div className="text-xl font-bold text-slate-100">{stat.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}