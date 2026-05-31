import React, { useEffect, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  CartesianGrid
} from 'recharts';
import { TrendingUp, RefreshCw, BarChart2, PieChart as PieIcon, ListCollapse } from 'lucide-react';

const COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Reports() {
  const [reportsData, setReportsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('roomy_token');
      const res = await fetch('/api/reports', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load reports');
      const data = await res.json();
      setReportsData(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Could not fetch analytical reports. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem', color: 'var(--text-secondary)' }}>
        <div>Loading reports and rendering visualizations...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '3rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--accent-danger)' }}>{error}</p>
        <button className="btn btn-primary" onClick={fetchReports}>
          <RefreshCw size={16} /> Try Again
        </button>
      </div>
    );
  }

  // Pre-process Category Data for Recharts Pie Chart
  const pieData = reportsData?.category_spending?.map(item => ({
    name: item.category,
    value: item.amount
  })) || [];

  // Pre-process Roommate Contributions for Recharts Bar Chart
  const barData = reportsData?.contribution_report?.map(item => ({
    name: item.name.split(' ')[0], // First name only for small screens
    'Direct Contribution': item.direct,
    'Out of Pocket': item.out_of_pocket,
    Total: item.total
  })) || [];

  // Pre-process Grocery Stocks
  const stockData = reportsData?.grocery_stock || [];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Reports & Analytics</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Analytics charts covering monthly expenditures, roommate contributions, category splits, and grocery stocks.</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchReports}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Main Charts Grid */}
      <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))' }}>
        
        {/* Category Expense Split Pie Chart */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '350px' }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <PieIcon size={18} /> Category Spending Split
          </h3>
          <div style={{ flex: 1, minHeight: 0 }}>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`₹${value}`, 'AmountSpent']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                No category expenses logged.
              </div>
            )}
          </div>
        </div>

        {/* Roommate Contribution Bar Chart */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '350px' }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <BarChart2 size={18} /> Contributions: Direct vs Out-of-Pocket
          </h3>
          <div style={{ flex: 1, minHeight: 0 }}>
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} />
                  <YAxis stroke="var(--text-secondary)" fontSize={12} />
                  <Tooltip formatter={(value) => [`₹${value}`, 'Amount']} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="Direct Contribution" stackId="a" fill="#6366f1" />
                  <Bar dataKey="Out of Pocket" stackId="a" fill="#06b6d4" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                No roommate contributions found.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Grocery Consumption Stock Levels Report */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <ListCollapse size={20} /> Current Pantry Stock Level Audit
        </h3>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Grocery Item</th>
                <th style={{ padding: '0.75rem 1rem' }}>Stock Available</th>
                <th style={{ padding: '0.75rem 1rem' }}>Min Safety Level</th>
                <th style={{ padding: '0.75rem 1rem' }}>Stock Status</th>
              </tr>
            </thead>
            <tbody>
              {stockData.length > 0 ? (
                stockData.map((item, idx) => {
                  const isLow = item.value < item.minStock;
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{item.name}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        {item.value} {item.unit}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>
                        {item.minStock} {item.unit}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        {isLow ? (
                          <span className="badge badge-danger">Needs Restock</span>
                        ) : (
                          <span className="badge badge-success">Sufficient</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No grocery stock levels.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
