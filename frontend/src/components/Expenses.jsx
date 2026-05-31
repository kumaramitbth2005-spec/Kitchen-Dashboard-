import React, { useState } from 'react';
import { Plus, IndianRupee, Calendar, FileText, User, ShoppingBag, CreditCard, ShieldAlert } from 'lucide-react';

const PREDEFINED_CATEGORIES = [
  'Grains',
  'Pulses (Dal)',
  'Vegetables',
  'Spices',
  'Oils & Others'
];

const PREDEFINED_ITEMS = {
  'Grains': ['Rice', 'Wheat Flour', 'Poha', 'Suji'],
  'Pulses (Dal)': ['Arhar Dal', 'Masoor Dal', 'Moong Dal', 'Chana Dal', 'Urad Dal'],
  'Vegetables': ['Potato', 'Onion', 'Tomato', 'Garlic', 'Ginger', 'Green Chilli'],
  'Spices': ['Turmeric', 'Red Chilli Powder', 'Coriander Powder', 'Garam Masala', 'Cumin', 'Mustard Seeds'],
  'Oils & Others': ['Cooking Oil', 'Salt', 'Sugar', 'Tea', 'Milk']
};

export default function Expenses({ 
  roommates, 
  expenses, 
  contributions, 
  stats, 
  currentUser, 
  onAddExpense, 
  onAddContribution,
  onEditExpense,
  onDeleteExpense
}) {
  const [activeSubTab, setActiveSubTab] = useState('expenses'); // 'expenses' or 'contributions'
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showContribModal, setShowContribModal] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  
  // Expense Form State
  const [category, setCategory] = useState('Grains');
  const [productName, setProductName] = useState('Rice');
  const [customProduct, setCustomProduct] = useState('');
  const [isCustomProduct, setIsCustomProduct] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('kg');
  const [amount, setAmount] = useState('');
  const [purchaserId, setPurchaserId] = useState(currentUser?.id || '');
  const [paymentMethod, setPaymentMethod] = useState('common_fund');
  const [notes, setNotes] = useState('');
  const [updateInventory, setUpdateInventory] = useState(true);

  // Contribution Form State
  const [contribId, setContribId] = useState(currentUser?.id || '');
  const [contribAmount, setContribAmount] = useState('');

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(val || 0);
  };

  const handleCategoryChange = (e) => {
    const cat = e.target.value;
    setCategory(cat);
    
    // Auto-update item lists
    const items = PREDEFINED_ITEMS[cat];
    if (items && items.length > 0) {
      setProductName(items[0]);
      setIsCustomProduct(false);
    } else {
      setIsCustomProduct(true);
      setProductName('');
    }
  };

  const handleProductChange = (e) => {
    const val = e.target.value;
    if (val === 'custom') {
      setIsCustomProduct(true);
      setProductName('');
    } else {
      setIsCustomProduct(false);
      setProductName(val);
      
      // Auto-set standard unit based on item
      if (['Rice', 'Wheat Flour', 'Poha', 'Suji', 'Arhar Dal', 'Masoor Dal', 'Moong Dal', 'Chana Dal', 'Urad Dal', 'Potato', 'Onion', 'Tomato', 'Salt', 'Sugar'].includes(val)) {
        setUnit('kg');
      } else if (['Garlic', 'Ginger', 'Green Chilli', 'Turmeric', 'Red Chilli Powder', 'Coriander Powder', 'Garam Masala', 'Cumin', 'Mustard Seeds'].includes(val)) {
        setUnit('g');
      } else if (['Cooking Oil', 'Milk'].includes(val)) {
        setUnit('litre');
      } else if (['Tea'].includes(val)) {
        setUnit('packets');
      } else {
        setUnit('pieces');
      }
    }
  };

  const submitExpense = (e) => {
    e.preventDefault();
    const finalProductName = isCustomProduct ? customProduct : productName;
    if (!finalProductName || !quantity || !amount) {
      alert('Please fill out all required fields.');
      return;
    }
    
    const payload = {
      product_name: finalProductName.trim(),
      quantity: parseFloat(quantity),
      unit,
      amount_spent: parseFloat(amount),
      purchased_by_id: parseInt(purchaserId),
      category,
      payment_method: paymentMethod,
      notes,
      update_inventory: editingExpenseId ? false : updateInventory
    };

    if (editingExpenseId) {
      onEditExpense(editingExpenseId, payload);
    } else {
      onAddExpense(payload);
    }

    // Reset Form
    setQuantity('');
    setAmount('');
    setNotes('');
    setCustomProduct('');
    setEditingExpenseId(null);
    setShowExpenseModal(false);
  };

  const submitContribution = (e) => {
    e.preventDefault();
    if (!contribAmount) {
      alert('Please enter an amount.');
      return;
    }
    
    onAddContribution({
      amount: parseFloat(contribAmount),
      contributor_id: parseInt(contribId)
    });

    setContribAmount('');
    setShowContribModal(false);
  };

  const handleEditClick = (e) => {
    setEditingExpenseId(e.id);
    setCategory(e.category);
    
    const items = PREDEFINED_ITEMS[e.category] || [];
    if (items.includes(e.product_name)) {
      setIsCustomProduct(false);
      setProductName(e.product_name);
    } else {
      setIsCustomProduct(true);
      setCustomProduct(e.product_name);
      setProductName('custom');
    }
    
    setQuantity(e.quantity);
    setUnit(e.unit);
    setAmount(e.amount_spent);
    setPurchaserId(e.purchased_by_id);
    setPaymentMethod(e.payment_method);
    setNotes(e.notes || '');
    setUpdateInventory(false);
    
    setShowExpenseModal(true);
  };

  // Calculate stats
  const totalContributionsPool = roommates?.reduce((sum, r) => sum + r.total_contribution, 0) || 0;
  const totalExpensesPool = stats?.total_spent || 0;
  const averageSpentShare = totalExpensesPool / (roommates?.length || 5);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Title block */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Financial ledger</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Track contributions, add room purchases, and balance split calculations.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={() => setShowContribModal(true)}>
            <Plus size={18} /> Add Contribution
          </button>
          <button className="btn btn-primary" onClick={() => {
            // Reset to default on open
            setCategory('Grains');
            setProductName('Rice');
            setIsCustomProduct(false);
            setPurchaserId(currentUser?.id || '');
            setPaymentMethod('common_fund');
            setShowExpenseModal(true);
          }}>
            <Plus size={18} /> Log Purchase
          </button>
        </div>
      </div>

      {/* Contribution Pool Summaries */}
      <div className="grid-cols-1 grid-cols-3" style={{ gap: '1.25rem' }}>
        <div className="glass-card" style={{ borderLeft: '4px solid var(--accent-primary)' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Common Pool Contributions</p>
          <h2 style={{ fontSize: '1.8rem', margin: '0.25rem 0' }}>{formatCurrency(totalContributionsPool)}</h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sum of all direct deposits & out-of-pocket buying</p>
        </div>
        <div className="glass-card" style={{ borderLeft: '4px solid var(--accent-success)' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Spent</p>
          <h2 style={{ fontSize: '1.8rem', margin: '0.25rem 0' }}>{formatCurrency(totalExpensesPool)}</h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sum of all roommate purchases recorded</p>
        </div>
        <div className="glass-card" style={{ borderLeft: '4px solid var(--accent-secondary)' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Remaining Balance (Cash on Hand)</p>
          <h2 style={{ fontSize: '1.8rem', margin: '0.25rem 0', color: stats?.room_balance < 0 ? 'var(--accent-danger)' : 'var(--accent-success)' }}>
            {formatCurrency(stats?.room_balance)}
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Calculated as direct cash contributions minus common fund spent</p>
        </div>
      </div>

      {/* Contribution split analysis */}
      <div className="glass-card">
        <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Roommate Split Analysis</h3>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', alignItems: 'center' }}>
          <ShieldAlert style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <strong>Fair Share:</strong> Each roommate's equal share of total room expenses is <strong>{formatCurrency(averageSpentShare)}</strong> (Total Spent / 5).
            Roommates with <span style={{ color: 'var(--accent-success)', fontWeight: 600 }}>Positive Net Balance</span> have contributed more than their fair share and are due refunds.
            Roommates with <span style={{ color: 'var(--accent-danger)', fontWeight: 600 }}>Negative Net Balance</span> have contributed less and owe money to the common fund.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {roommates && roommates.map(rm => {
            const contributionPercentage = totalContributionsPool > 0 
              ? ((rm.total_contribution / totalContributionsPool) * 100).toFixed(1)
              : 0;
            
            return (
              <div key={rm.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{rm.name}</span>
                  <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.9rem' }}>
                    <span>Contrib: <strong>{formatCurrency(rm.total_contribution)}</strong> ({contributionPercentage}%)</span>
                    <span style={{ color: rm.balance >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)', fontWeight: 600 }}>
                      {rm.balance >= 0 ? '+' : ''}{formatCurrency(rm.balance)}
                    </span>
                  </div>
                </div>
                {/* Progress bar representing Contribution ratio */}
                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
                  <div style={{ 
                    width: `${Math.min(100, Math.max(0, (rm.total_contribution / (totalContributionsPool || 1)) * 100))}%`, 
                    height: '100%', 
                    background: rm.balance >= 0 ? 'var(--accent-primary)' : 'var(--text-muted)',
                    borderRadius: '4px'
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ledger Logs Toggle Tabs */}
      <div>
        <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1rem' }}>
          <button 
            style={{ 
              background: 'none', 
              border: 'none', 
              padding: '0.75rem 0.5rem', 
              fontSize: '1rem', 
              fontWeight: 600, 
              color: activeSubTab === 'expenses' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              borderBottom: activeSubTab === 'expenses' ? '2px solid var(--accent-primary)' : 'none',
              cursor: 'pointer'
            }}
            onClick={() => setActiveSubTab('expenses')}
          >
            Expenses Log
          </button>
          <button 
            style={{ 
              background: 'none', 
              border: 'none', 
              padding: '0.75rem 0.5rem', 
              fontSize: '1rem', 
              fontWeight: 600, 
              color: activeSubTab === 'contributions' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              borderBottom: activeSubTab === 'contributions' ? '2px solid var(--accent-primary)' : 'none',
              cursor: 'pointer'
            }}
            onClick={() => setActiveSubTab('contributions')}
          >
            Contributions Log
          </button>
        </div>

        {/* Expenses List */}
        {activeSubTab === 'expenses' && (
          <div className="glass-card" style={{ padding: '0' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '1rem' }}>Date</th>
                    <th style={{ padding: '1rem' }}>Item</th>
                    <th style={{ padding: '1rem' }}>Qty</th>
                    <th style={{ padding: '1rem' }}>Category</th>
                    <th style={{ padding: '1rem' }}>Purchaser</th>
                    <th style={{ padding: '1rem' }}>Method</th>
                    <th style={{ padding: '1rem', textAlign: 'right' }}>Amount</th>
                    <th style={{ padding: '1rem', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses && expenses.length > 0 ? (
                    expenses.map(e => (
                      <tr key={e.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            <Calendar size={14} />
                            {new Date(e.created_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', fontWeight: 600 }}>{e.product_name}</td>
                        <td style={{ padding: '1rem' }}>{e.quantity} {e.unit}</td>
                        <td style={{ padding: '1rem' }}>
                          <span className={`badge badge-${e.category === 'Spices' ? 'warning' : e.category === 'Vegetables' ? 'success' : 'primary'}`}>
                            {e.category}
                          </span>
                        </td>
                        <td style={{ padding: '1rem' }}>{e.purchased_by_name}</td>
                        <td style={{ padding: '1rem' }}>
                          <span className={`badge ${e.payment_method === 'common_fund' ? 'badge-primary' : 'badge-warning'}`} style={{ fontSize: '0.7rem' }}>
                            {e.payment_method === 'common_fund' ? 'Common Fund' : 'Out of Pocket'}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700 }}>{formatCurrency(e.amount_spent)}</td>
                        <td style={{ padding: '1rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <button 
                            className="btn btn-secondary btn-sm" 
                            style={{ padding: '0.25rem 0.5rem', marginRight: '0.4rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center' }} 
                            onClick={() => handleEditClick(e)}
                          >
                            ✏️ Edit
                          </button>
                          <button 
                            className="btn btn-danger btn-sm" 
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', background: 'var(--accent-danger)' }} 
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete this expense for ${e.product_name}?`)) {
                                onDeleteExpense(e.id);
                              }
                            }}
                          >
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No expenses logged yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Contributions List */}
        {activeSubTab === 'contributions' && (
          <div className="glass-card" style={{ padding: '0' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '1rem' }}>Date</th>
                    <th style={{ padding: '1rem' }}>Contributor</th>
                    <th style={{ padding: '1rem', textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {contributions && contributions.length > 0 ? (
                    contributions.map(c => (
                      <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '1rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            <Calendar size={14} />
                            {new Date(c.created_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', fontWeight: 600 }}>{c.contributor_name}</td>
                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700, color: 'var(--accent-success)' }}>{formatCurrency(c.amount)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No contributions logged yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Log Purchase Modal */}
      {showExpenseModal && (
        <div className="dialog-overlay">
          <form className="dialog-content" onSubmit={submitExpense}>
            <div className="dialog-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShoppingBag size={20} /> 
                {editingExpenseId ? 'Edit Purchase Details' : 'Log Purchase'}
              </h3>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm" 
                onClick={() => {
                  setEditingExpenseId(null);
                  setShowExpenseModal(false);
                }}
              >
                ✕
              </button>
            </div>
            
            <div className="dialog-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-input" value={category} onChange={handleCategoryChange}>
                  {PREDEFINED_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label">Product Name</label>
                  <button type="button" className="badge badge-primary" style={{ border: 'none', cursor: 'pointer' }} onClick={() => setIsCustomProduct(!isCustomProduct)}>
                    {isCustomProduct ? 'Select from list' : 'Type custom item'}
                  </button>
                </div>
                
                {isCustomProduct ? (
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Enter custom product name"
                    value={customProduct}
                    onChange={(e) => setCustomProduct(e.target.value)}
                    required
                  />
                ) : (
                  <select className="form-input" value={productName} onChange={handleProductChange}>
                    {PREDEFINED_ITEMS[category]?.map(item => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                    <option value="custom">-- Custom Item --</option>
                  </select>
                )}
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 2 }}>
                  <label className="form-label">Quantity</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0.01"
                    className="form-input" 
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Unit</label>
                  <select className="form-input" value={unit} onChange={(e) => setUnit(e.target.value)}>
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="litre">litre</option>
                    <option value="packets">packets</option>
                    <option value="pieces">pieces</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Amount Spent (INR)</label>
                <div style={{ position: 'relative' }}>
                  <IndianRupee size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    className="form-input" 
                    style={{ paddingLeft: '2.2rem' }}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Purchased By</label>
                <select className="form-input" value={purchaserId} onChange={(e) => setPurchaserId(e.target.value)}>
                  {roommates?.map(rm => (
                    <option key={rm.id} value={rm.id}>{rm.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select className="form-input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  <option value="common_fund">Paid from Common Fund</option>
                  <option value="out_of_pocket">Paid Out-of-Pocket by Purchaser</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Notes (Optional)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. bought from market, brand name"
                />
              </div>

              {!editingExpenseId && (
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <input 
                    type="checkbox" 
                    id="updateInventoryCheck"
                    checked={updateInventory} 
                    onChange={(e) => setUpdateInventory(e.target.checked)}
                  />
                  <label htmlFor="updateInventoryCheck" className="form-label" style={{ margin: 0, cursor: 'pointer' }}>
                    Automatically update stock levels in grocery inventory
                  </label>
                </div>
              )}
            </div>
            
            <div className="dialog-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => {
                  setEditingExpenseId(null);
                  setShowExpenseModal(false);
                }}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {editingExpenseId ? 'Save Changes' : 'Save Expense'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Contribution Modal */}
      {showContribModal && (
        <div className="dialog-overlay">
          <form className="dialog-content" onSubmit={submitContribution}>
            <div className="dialog-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CreditCard size={20} /> Add Contribution</h3>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowContribModal(false)}>✕</button>
            </div>
            
            <div className="dialog-body">
              <div className="form-group">
                <label className="form-label">Contributor Name</label>
                <select className="form-input" value={contribId} onChange={(e) => setContribId(e.target.value)}>
                  {roommates?.map(rm => (
                    <option key={rm.id} value={rm.id}>{rm.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Amount Contributed (INR)</label>
                <div style={{ position: 'relative' }}>
                  <IndianRupee size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                  <input 
                    type="number" 
                    step="0.01"
                    min="1"
                    className="form-input" 
                    style={{ paddingLeft: '2.2rem' }}
                    value={contribAmount}
                    onChange={(e) => setContribAmount(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
            
            <div className="dialog-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowContribModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save Contribution</button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
