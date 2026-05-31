import React, { useState } from 'react';
import { 
  DollarSign, 
  ShoppingCart, 
  AlertTriangle, 
  TrendingUp, 
  Award, 
  ArrowUpRight, 
  ArrowDownRight,
  ClipboardList,
  X,
  CreditCard,
  Plus
} from 'lucide-react';

export default function Dashboard({ 
  stats, 
  roommates, 
  onTabChange,
  currentUser,
  expenses = [],
  contributions = [],
  onAddExpense,
  onAddContribution,
  selectedRoommateId,
  setSelectedRoommateId
}) {
  if (!stats) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
        <div className="loader">Loading Dashboard Stats...</div>
      </div>
    );
  }

  // Modal Quick Log States
  const [activeModalTab, setActiveModalTab] = useState('spend'); // 'spend' or 'deposit'
  const [expName, setExpName] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expQty, setExpQty] = useState('1');
  const [expUnit, setExpUnit] = useState('packets');
  const [expCategory, setExpCategory] = useState('Oils & Others');
  const [expPaymentMethod, setExpPaymentMethod] = useState('out_of_pocket'); // default to out_of_pocket so it registers as personal contribution!
  const [expNotes, setExpNotes] = useState('');
  
  const [contribAmount, setContribAmount] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const handleAddExpenseSubmit = async (e) => {
    e.preventDefault();
    if (!expName || !expAmount) return;
    setFormLoading(true);
    try {
      const payload = {
        product_name: expName.trim(),
        quantity: parseFloat(expQty) || 1,
        unit: expUnit,
        amount_spent: parseFloat(expAmount),
        category: expCategory,
        payment_method: expPaymentMethod,
        notes: expNotes.trim(),
        update_inventory: true // Automatically check if we can update inventory
      };
      await onAddExpense(payload);
      // Reset
      setExpName('');
      setExpAmount('');
      setExpQty('1');
      setExpNotes('');
    } catch (err) {
      console.error(err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleAddContributionSubmit = async (e) => {
    e.preventDefault();
    if (!contribAmount) return;
    setFormLoading(true);
    try {
      const payload = {
        amount: parseFloat(contribAmount),
        contributor_id: currentUser.id
      };
      await onAddContribution(payload);
      setContribAmount('');
    } catch (err) {
      console.error(err);
    } finally {
      setFormLoading(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Welcome Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Kitchen Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Welcome back! Here is a summary of your room's expenses and inventory status.</p>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid-cols-1 grid-cols-2 grid-cols-4" style={{ gap: '1.25rem' }}>
        
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'var(--accent-primary-glow)', color: 'var(--accent-primary)' }}>
            <DollarSign size={28} />
          </div>
          <div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Room Balance</p>
            <h3 style={{ fontSize: '1.6rem', color: stats.room_balance < 0 ? 'var(--accent-danger)' : 'var(--text-primary)' }}>
              {formatCurrency(stats.room_balance)}
            </h3>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'var(--accent-success-glow)', color: 'var(--accent-success)' }}>
            <TrendingUp size={28} />
          </div>
          <div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Monthly Expenses</p>
            <h3 style={{ fontSize: '1.6rem' }}>{formatCurrency(stats.monthly_expenses)}</h3>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'var(--accent-warning-glow)', color: 'var(--accent-warning)' }}>
            <Award size={28} />
          </div>
          <div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Top Contributor</p>
            <h3 style={{ fontSize: '1.25rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '140px' }} title={stats.top_contributor}>
              {stats.top_contributor}
            </h3>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '12px', background: stats.low_stock_items > 0 ? 'var(--accent-danger-glow)' : 'var(--accent-primary-glow)', color: stats.low_stock_items > 0 ? 'var(--accent-danger)' : 'var(--accent-primary)' }}>
            <AlertTriangle size={28} />
          </div>
          <div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Low Stock Items</p>
            <h3 style={{ fontSize: '1.6rem' }}>{stats.low_stock_items}</h3>
          </div>
        </div>

      </div>

      {/* Main Dashboard Widgets Grid */}
      <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        
        {/* Roommate Ledger */}
        <div id="roommate-balances-section" className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.2rem' }}>Roommate Balances</h3>
            <button className="badge badge-primary" style={{ border: 'none', cursor: 'pointer' }} onClick={() => onTabChange('expenses')}>
              View Expenses
            </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {roommates && roommates.map(rm => (
              <div 
                key={rm.id} 
                onClick={() => setSelectedRoommateId(rm.id)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '0.75rem', 
                  borderRadius: '10px', 
                  background: 'rgba(255,255,255,0.03)', 
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  transform: 'scale(1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
                  e.currentTarget.style.borderColor = 'var(--accent-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ 
                    width: '38px', 
                    height: '38px', 
                    borderRadius: '50%', 
                    background: rm.balance >= 0 ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #ef4444, #b91c1c)', 
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.9rem'
                  }}>
                    {rm.avatar_url ? <img src={rm.avatar_url} alt={rm.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : rm.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>{rm.name}</h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Contribution: {formatCurrency(rm.total_contribution)}</p>
                  </div>
                </div>
                
                <div style={{ textAlign: 'right' }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '2px', 
                    fontWeight: 700,
                    color: rm.balance >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' 
                  }}>
                    {rm.balance >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                    {formatCurrency(Math.abs(rm.balance))}
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {rm.balance >= 0 ? 'Owed' : 'Owes'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Kitchen Register */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.2rem' }}>Kitchen Register</h3>
            <button className="badge badge-primary" style={{ border: 'none', cursor: 'pointer' }} onClick={() => onTabChange('expenses')}>
              View Ledger
            </button>
          </div>
          
          <div style={{ overflowX: 'auto', flex: 1 }}>
            {roommates && roommates.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '420px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    <th style={{ padding: '0.5rem 0.25rem', fontWeight: 600 }}>Roommate</th>
                    <th style={{ padding: '0.5rem 0.25rem', fontWeight: 600, textAlign: 'right' }}>Contributed</th>
                    <th style={{ padding: '0.5rem 0.25rem', fontWeight: 600, textAlign: 'right' }}>Purchased</th>
                    <th style={{ padding: '0.5rem 0.25rem', fontWeight: 600, textAlign: 'right' }}>Fair Share</th>
                    <th style={{ padding: '0.5rem 0.25rem', fontWeight: 600, textAlign: 'right' }}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {roommates.map((rm) => {
                    const fairShare = (stats.total_spent || 0) / roommates.length;
                    return (
                      <tr 
                        key={rm.id} 
                        onClick={() => setSelectedRoommateId(rm.id)}
                        style={{ 
                          borderBottom: '1px solid var(--border-color)', 
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <td style={{ padding: '0.75rem 0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ 
                            width: '26px', 
                            height: '26px', 
                            borderRadius: '50%', 
                            background: rm.balance >= 0 ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #ef4444, #b91c1c)', 
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.7rem',
                            flexShrink: 0
                          }}>
                            {rm.avatar_url ? (
                              <img src={rm.avatar_url} alt={rm.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                              rm.name.substring(0, 2).toUpperCase()
                            )}
                          </div>
                          <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{rm.name}</span>
                        </td>
                        <td style={{ padding: '0.75rem 0.25rem', textAlign: 'right', fontWeight: 500 }}>
                          {formatCurrency(rm.total_contribution)}
                        </td>
                        <td style={{ padding: '0.75rem 0.25rem', textAlign: 'right', color: 'var(--text-secondary)' }}>
                          {formatCurrency(rm.total_expenses_made)}
                        </td>
                        <td style={{ padding: '0.75rem 0.25rem', textAlign: 'right', color: 'var(--text-secondary)' }}>
                          {formatCurrency(fairShare)}
                        </td>
                        <td style={{ 
                          padding: '0.75rem 0.25rem', 
                          textAlign: 'right', 
                          fontWeight: 700, 
                          color: rm.balance >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' 
                        }}>
                          {rm.balance >= 0 ? '+' : ''}{formatCurrency(rm.balance)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                No roommate data found.
              </div>
            )}
          </div>
        </div>
        
        {/* Quick Actions / Alerts */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3 style={{ fontSize: '1.2rem' }}>Quick Actions & Alerts</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            {stats.low_stock_items > 0 && (
              <div style={{ display: 'flex', gap: '0.75rem', padding: '1rem', borderRadius: '10px', background: 'var(--accent-danger-glow)', border: '1px solid var(--accent-danger)' }}>
                <AlertTriangle style={{ color: 'var(--accent-danger)', flexShrink: 0 }} />
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-danger)' }}>Low Stock Alert!</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    There are {stats.low_stock_items} grocery items falling below minimum levels.
                  </p>
                  <button 
                    className="btn btn-primary btn-sm" 
                    style={{ marginTop: '0.5rem', background: 'var(--accent-danger)' }}
                    onClick={() => onTabChange('inventory')}
                  >
                    Manage Inventory
                  </button>
                </div>
              </div>
            )}
            
            {stats.pending_requests > 0 && (
              <div style={{ display: 'flex', gap: '0.75rem', padding: '1rem', borderRadius: '10px', background: 'var(--accent-primary-glow)', border: '1px solid var(--accent-primary)' }}>
                <ClipboardList style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-primary)' }}>Request Board</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    There are {stats.pending_requests} pending shopping tasks on the roommate board.
                  </p>
                  <button 
                    className="btn btn-primary btn-sm" 
                    style={{ marginTop: '0.5rem' }}
                    onClick={() => onTabChange('requests')}
                  >
                    Go to Tasks
                  </button>
                </div>
              </div>
            )}
            
            <div className="grid-cols-2" style={{ gap: '0.75rem' }}>
              <button 
                className="btn btn-secondary" 
                style={{ padding: '0.85rem', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', height: '80px', borderRadius: '12px' }}
                onClick={() => onTabChange('timers')}
              >
                🍳 <span>Kitchen Alarms</span>
              </button>
              <button 
                className="btn btn-secondary" 
                style={{ padding: '0.85rem', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', height: '80px', borderRadius: '12px' }}
                onClick={() => onTabChange('reports')}
              >
                📊 <span>Reports & Charts</span>
              </button>
            </div>
            
          </div>
        </div>

      </div>

      {/* Roommate Personal Register Modal */}
      {selectedRoommateId && (() => {
        const selectedRoommate = roommates?.find(r => r.id === selectedRoommateId);
        if (!selectedRoommate) return null;
        
        // Filter personal history
        const personalExpenses = expenses?.filter(e => e.purchased_by_id === selectedRoommate.id) || [];
        const personalContributions = contributions?.filter(c => c.contributor_id === selectedRoommate.id) || [];
        
        const personalHistory = [
          ...personalExpenses.map(e => ({
            id: `exp-${e.id}`,
            type: 'expense',
            title: e.product_name,
            amount: e.amount_spent,
            payment_method: e.payment_method,
            created_at: e.created_at,
            notes: e.notes || 'Purchased grocery item',
            category: e.category
          })),
          ...personalContributions.map(c => ({
            id: `contrib-${c.id}`,
            type: 'contribution',
            title: 'Common Fund Deposit',
            amount: c.amount,
            payment_method: 'cash',
            created_at: c.created_at,
            notes: 'Added cash to room common fund pool',
            category: 'Deposit'
          }))
        ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        const fairShare = (stats?.total_spent || 0) / (roommates?.length || 5);
        const totalRoomContributions = roommates?.reduce((acc, r) => acc + r.total_contribution, 0) || 0;
        const contributionPercentage = totalRoomContributions > 0 ? ((selectedRoommate.total_contribution / totalRoomContributions) * 100).toFixed(1) : 0;
        const isSelf = currentUser && currentUser.id === selectedRoommate.id;

        return (
          <div className="dialog-overlay" onClick={() => setSelectedRoommateId(null)}>
            <div 
              className="dialog-content glass-card" 
              onClick={(e) => e.stopPropagation()} 
              style={{ 
                maxWidth: '850px', 
                width: '100%', 
                maxHeight: '90vh', 
                display: 'flex', 
                flexDirection: 'column', 
                padding: 0,
                border: '1px solid var(--border-color)',
                overflow: 'hidden'
              }}
            >
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ 
                    width: '42px', 
                    height: '42px', 
                    borderRadius: '50%', 
                    background: selectedRoommate.balance >= 0 ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #ef4444, #b91c1c)', 
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '1rem'
                  }}>
                    {selectedRoommate.avatar_url ? (
                      <img src={selectedRoommate.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      selectedRoommate.name.substring(0, 2).toUpperCase()
                    )}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {selectedRoommate.name}'s Register 
                      {isSelf && <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>You</span>}
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>@{selectedRoommate.username}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedRoommateId(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.25rem' }}
                >
                  <X size={24} />
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', overflowY: 'auto', flex: 1 }}>
                
                {/* Left Side: Personal Ledger History Storage (Read-Only) */}
                <div style={{ padding: '1.5rem', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '300px' }}>
                  <h4 style={{ fontSize: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Register Storage</span>
                    <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>Read Only (Immutable)</span>
                  </h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', maxHeight: '420px', paddingRight: '4px', flex: 1 }}>
                    {personalHistory.length > 0 ? (
                      personalHistory.map((item) => (
                        <div 
                          key={item.id} 
                          style={{ 
                            padding: '0.75rem', 
                            borderRadius: '8px', 
                            background: 'rgba(255,255,255,0.02)', 
                            border: '1px solid var(--border-color)',
                            borderLeft: `4px solid ${item.type === 'expense' ? 'var(--accent-primary)' : 'var(--accent-success)'}`,
                            fontSize: '0.85rem'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, marginBottom: '0.25rem' }}>
                            <span>{item.title}</span>
                            <span style={{ color: item.type === 'expense' ? 'var(--text-primary)' : 'var(--accent-success)' }}>
                              {item.type === 'expense' ? '-' : '+'}{formatCurrency(item.amount)}
                            </span>
                          </div>
                          <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.4rem' }}>{item.notes}</p>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            <span>Method: {item.payment_method?.replace('_', ' ')}</span>
                            <span>{new Date(item.created_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        No transaction storage records found for this roommate.
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Side: Roommate Stats & Quick Log Form */}
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', background: 'rgba(255,255,255,0.01)' }}>
                  
                  {/* Detailed Personal Stats */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <h4 style={{ fontSize: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', color: 'var(--text-primary)' }}>
                      Personal Balance Sheet
                    </h4>
                    
                    <div className="grid-cols-2" style={{ gap: '0.75rem' }}>
                      <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total Contributed</p>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-success)' }}>{formatCurrency(selectedRoommate.total_contribution)}</h4>
                      </div>
                      <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total Purchased</p>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{formatCurrency(selectedRoommate.total_expenses_made)}</h4>
                      </div>
                      <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Equal Fair Share</p>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{formatCurrency(fairShare)}</h4>
                      </div>
                      <div style={{ padding: '0.75rem', borderRadius: '8px', background: selectedRoommate.balance >= 0 ? 'var(--accent-success-glow)' : 'var(--accent-danger-glow)', border: `1px solid ${selectedRoommate.balance >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)'}` }}>
                        <p style={{ fontSize: '0.75rem', color: selectedRoommate.balance >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>Net Balance</p>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: selectedRoommate.balance >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                          {selectedRoommate.balance >= 0 ? '+' : ''}{formatCurrency(selectedRoommate.balance)}
                        </h4>
                      </div>
                    </div>

                    <div style={{ marginTop: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                        <span>Common Fund Contribution Share</span>
                        <strong>{contributionPercentage}%</strong>
                      </div>
                      <div style={{ width: '100%', height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${contributionPercentage}%`, height: '100%', background: 'var(--accent-success)', borderRadius: '3px' }} />
                      </div>
                    </div>
                  </div>

                  {/* Add Spend or Deposit (Only if current user is this roommate) */}
                  {isSelf ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: 'auto' }}>
                      <h4 style={{ fontSize: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', color: 'var(--text-primary)' }}>
                        Log New Transaction
                      </h4>
                      
                      {/* Tabs */}
                      <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '3px', border: '1px solid var(--border-color)' }}>
                        <button 
                          onClick={() => setActiveModalTab('spend')}
                          style={{ 
                            flex: 1, 
                            border: 'none', 
                            padding: '0.5rem', 
                            fontSize: '0.8rem', 
                            fontWeight: 600, 
                            borderRadius: '6px', 
                            cursor: 'pointer',
                            background: activeModalTab === 'spend' ? 'var(--accent-primary-glow)' : 'transparent',
                            color: activeModalTab === 'spend' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            transition: 'all 0.2s'
                          }}
                        >
                          🛒 Spend Money
                        </button>
                        <button 
                          onClick={() => setActiveModalTab('deposit')}
                          style={{ 
                            flex: 1, 
                            border: 'none', 
                            padding: '0.5rem', 
                            fontSize: '0.8rem', 
                            fontWeight: 600, 
                            borderRadius: '6px', 
                            cursor: 'pointer',
                            background: activeModalTab === 'deposit' ? 'var(--accent-success-glow)' : 'transparent',
                            color: activeModalTab === 'deposit' ? 'var(--accent-success)' : 'var(--text-secondary)',
                            transition: 'all 0.2s'
                          }}
                        >
                          💳 Deposit Cash
                        </button>
                      </div>

                      {/* Tab Content: Spend Money */}
                      {activeModalTab === 'spend' && (
                        <form onSubmit={handleAddExpenseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Product Name</label>
                              <input 
                                type="text" 
                                placeholder="e.g. Milk, Rice" 
                                className="form-input" 
                                style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                                value={expName} 
                                onChange={(e) => setExpName(e.target.value)} 
                                required 
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Amount Spent (₹)</label>
                              <input 
                                type="number" 
                                placeholder="Spent amount" 
                                className="form-input" 
                                style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                                value={expAmount} 
                                onChange={(e) => setExpAmount(e.target.value)} 
                                required 
                                min="1"
                              />
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.5rem' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Category</label>
                              <select 
                                className="form-input" 
                                style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                                value={expCategory}
                                onChange={(e) => setExpCategory(e.target.value)}
                              >
                                <option value="Grains">🌾 Grains</option>
                                <option value="Pulses">🥣 Pulses (Dal)</option>
                                <option value="Vegetables">🥔 Vegetables</option>
                                <option value="Spices">🌶️ Spices</option>
                                <option value="Oils & Others">🧴 Oils & Others</option>
                              </select>
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Paid By / Method</label>
                              <select 
                                className="form-input" 
                                style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                                value={expPaymentMethod}
                                onChange={(e) => setExpPaymentMethod(e.target.value)}
                              >
                                <option value="out_of_pocket">Out of Pocket (Personal)</option>
                                <option value="common_fund">Common Fund (Room Pool)</option>
                              </select>
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Qty</label>
                                <input 
                                  type="number" 
                                  step="any"
                                  className="form-input" 
                                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                                  value={expQty} 
                                  onChange={(e) => setExpQty(e.target.value)}
                                  required
                                />
                              </div>
                              <div style={{ flex: 1.5 }}>
                                <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Unit</label>
                                <select 
                                  className="form-input" 
                                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                                  value={expUnit}
                                  onChange={(e) => setExpUnit(e.target.value)}
                                >
                                  <option value="packets">packets</option>
                                  <option value="kg">kg</option>
                                  <option value="g">g</option>
                                  <option value="litres">litres</option>
                                  <option value="units">units</option>
                                </select>
                              </div>
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Notes (Optional)</label>
                              <input 
                                type="text" 
                                placeholder="notes" 
                                className="form-input" 
                                style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                                value={expNotes} 
                                onChange={(e) => setExpNotes(e.target.value)} 
                              />
                            </div>
                          </div>

                          <button 
                            type="submit" 
                            className="btn btn-primary" 
                            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', width: '100%', marginTop: '0.25rem' }}
                            disabled={formLoading}
                          >
                            {formLoading ? 'Saving...' : '💾 Save Spend Log'}
                          </button>
                        </form>
                      )}

                      {/* Tab Content: Deposit Cash */}
                      {activeModalTab === 'deposit' && (
                        <form onSubmit={handleAddContributionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Amount Deposited (₹)</label>
                            <input 
                              type="number" 
                              placeholder="e.g. 500, 1000" 
                              className="form-input" 
                              style={{ padding: '0.5rem 0.75rem', fontSize: '0.9rem' }}
                              value={contribAmount} 
                              onChange={(e) => setContribAmount(e.target.value)} 
                              required 
                              min="1"
                            />
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                              This will add cash directly into the room's physical common fund drawer.
                            </p>
                          </div>

                          <button 
                            type="submit" 
                            className="btn btn-success" 
                            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', width: '100%', marginTop: '0.25rem' }}
                            disabled={formLoading}
                          >
                            {formLoading ? 'Depositing...' : '💳 Save Contribution'}
                          </button>
                        </form>
                      )}
                    </div>
                  ) : (
                    <div style={{ 
                      marginTop: 'auto', 
                      padding: '1rem', 
                      borderRadius: '8px', 
                      background: 'rgba(255,255,255,0.02)', 
                      border: '1px dashed var(--border-color)',
                      textAlign: 'center' 
                    }}>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        🔒 You are currently logged in as <strong>{currentUser?.name}</strong>.
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        You can only log spends and deposits for your own register. Select your card above or click your profile badge at the top to record spends.
                      </p>
                    </div>
                  )}

                </div>

              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
