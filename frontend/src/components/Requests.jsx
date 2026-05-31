import React, { useState } from 'react';
import { Plus, Check, MessageSquare, Clipboard, Calendar, DollarSign, ShoppingBag, ShoppingCart } from 'lucide-react';

const PREDEFINED_CATEGORIES = [
  'Grains',
  'Pulses (Dal)',
  'Vegetables',
  'Spices',
  'Oils & Others',
  'Others'
];

const PREDEFINED_ITEMS = {
  'Grains': ['Rice', 'Wheat Flour', 'Poha', 'Suji'],
  'Pulses (Dal)': ['Arhar Dal', 'Masoor Dal', 'Moong Dal', 'Chana Dal', 'Urad Dal'],
  'Vegetables': ['Potato', 'Onion', 'Tomato', 'Garlic', 'Ginger', 'Green Chilli'],
  'Spices': ['Turmeric', 'Red Chilli Powder', 'Coriander Powder', 'Garam Masala', 'Cumin', 'Mustard Seeds'],
  'Oils & Others': ['Cooking Oil', 'Salt', 'Sugar', 'Tea', 'Milk'],
  'Others': ['Gas Cylinder', 'Dishwashing Liquid', 'Matchbox', 'Sponge']
};

export default function Requests({ 
  requests, 
  roommates, 
  currentUser, 
  onAddRequest, 
  onCompleteRequest,
  onAssignRequest
}) {
  const [activeSubTab, setActiveSubTab] = useState('board'); // 'board' or 'shopping'
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutItem, setCheckoutItem] = useState(null);
  
  // Track selected assignee ID for each request ID in dropdowns
  const [assigneeSelection, setAssigneeSelection] = useState({});

  // Request Form State
  const [category, setCategory] = useState('Grains');
  const [itemName, setItemName] = useState('Rice');
  const [customItem, setCustomItem] = useState('');
  const [isCustomItem, setIsCustomItem] = useState(false);
  const [qtyRequested, setQtyRequested] = useState('');
  const [unit, setUnit] = useState('kg');

  // Checkout Form State (when shopping)
  const [qtyPurchased, setQtyPurchased] = useState('');
  const [amountSpent, setAmountSpent] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('common_fund');
  const [checkoutNotes, setCheckoutNotes] = useState('');

  const submitRequest = (e) => {
    e.preventDefault();
    const finalItemName = isCustomItem ? customItem : itemName;
    if (!finalItemName) {
      alert('Please enter an item name.');
      return;
    }

    onAddRequest({
      item_name: finalItemName.trim(),
      quantity: qtyRequested ? parseFloat(qtyRequested) : null,
      unit: qtyRequested ? unit : ''
    });

    // Reset Form
    setItemName('Rice');
    setCustomItem('');
    setQtyRequested('');
    setIsCustomItem(false);
    setShowRequestModal(false);
  };

  const handleCheckoutClick = (reqItem) => {
    setCheckoutItem(reqItem);
    setQtyPurchased(reqItem.quantity || '1');
    setAmountSpent('');
    setPaymentMethod('common_fund');
    setCheckoutNotes(`Purchased ${reqItem.item_name} from Request Board`);
    setShowCheckoutModal(true);
  };

  const submitCheckout = (e) => {
    e.preventDefault();
    if (!amountSpent) {
      alert('Please enter the amount spent.');
      return;
    }

    onCompleteRequest(checkoutItem.id, {
      amount_spent: parseFloat(amountSpent),
      payment_method: paymentMethod,
      quantity_purchased: parseFloat(qtyPurchased),
      notes: checkoutNotes
    });

    setShowCheckoutModal(false);
    setCheckoutItem(null);
  };

  const handleAssignClick = (reqId) => {
    const selectedId = assigneeSelection[reqId] || currentUser.id;
    onAssignRequest(reqId, parseInt(selectedId));
  };

  const handleUnassignClick = (reqId) => {
    onAssignRequest(reqId, null);
  };

  const handleAssigneeChange = (reqId, value) => {
    setAssigneeSelection(prev => ({ ...prev, [reqId]: value }));
  };

  const handleCategoryChange = (e) => {
    const cat = e.target.value;
    setCategory(cat);
    const list = PREDEFINED_ITEMS[cat];
    if (list && list.length > 0) {
      setItemName(list[0]);
      setIsCustomItem(false);
    } else {
      setIsCustomItem(true);
      setItemName('');
    }
  };

  const handleItemChange = (e) => {
    const val = e.target.value;
    if (val === 'custom') {
      setIsCustomItem(true);
      setItemName('');
    } else {
      setIsCustomItem(false);
      setItemName(val);
      
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

  const pendingRequests = requests?.filter(r => r.completed === 0) || [];
  const completedRequests = requests?.filter(r => r.completed === 1) || [];
  const unreadCompletedCount = completedRequests.filter(r => r.is_read === 0).length;

  // Shopping Mode Groupings
  const myShoppingTasks = pendingRequests.filter(r => r.assigned_to_id === currentUser.id);
  const otherShoppingTasks = pendingRequests.filter(r => r.assigned_to_id && r.assigned_to_id !== currentUser.id);
  const unassignedShoppingTasks = pendingRequests.filter(r => !r.assigned_to_id);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Coordination Board</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Post shopping requests, coordinate grocery buying, and check-out items when returning.</p>
        </div>
        <div>
          <button className="btn btn-primary" onClick={() => {
            setCategory('Grains');
            setItemName('Rice');
            setIsCustomItem(false);
            setShowRequestModal(true);
          }}>
            <Plus size={18} /> New Request
          </button>
        </div>
      </div>

      {/* Sub tabs switching between Board view and Shopping list */}
      <div>
        <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1rem' }}>
          <button 
            style={{ 
              background: 'none', 
              border: 'none', 
              padding: '0.75rem 0.5rem', 
              fontSize: '1rem', 
              fontWeight: 600, 
              color: activeSubTab === 'board' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              borderBottom: activeSubTab === 'board' ? '2px solid var(--accent-primary)' : 'none',
              cursor: 'pointer'
            }}
            onClick={() => setActiveSubTab('board')}
          >
            Request Board ({pendingRequests.length} Active)
          </button>
          <button 
            style={{ 
              background: 'none', 
              border: 'none', 
              padding: '0.75rem 0.5rem', 
              fontSize: '1rem', 
              fontWeight: 600, 
              color: activeSubTab === 'shopping' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              borderBottom: activeSubTab === 'shopping' ? '2px solid var(--accent-primary)' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
            onClick={() => setActiveSubTab('shopping')}
          >
            <ShoppingCart size={16} /> Shopping Mode 
            {pendingRequests.length > 0 && (
              <span style={{ fontSize: '0.7rem', padding: '1px 6px', background: 'var(--accent-primary)', color: '#ffffff', borderRadius: '10px', fontWeight: 700 }}>
                {pendingRequests.length}
              </span>
            )}
          </button>
        </div>

        {/* REQUEST BOARD VIEW */}
        {activeSubTab === 'board' && (
          <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
            
            {/* Active Requests List */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '1.15rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Pending Requests</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '480px', overflowY: 'auto' }}>
                {pendingRequests.length > 0 ? (
                  pendingRequests.map(r => (
                    <div key={r.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', padding: '1rem', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>{r.item_name}</h4>
                        {r.quantity && (
                          <span className="badge badge-primary">
                            {r.quantity} {r.unit}
                          </span>
                        )}
                      </div>
                      
                      {/* Requested by roommate details */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <span>Requested by {r.requested_by_name}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <Calendar size={12} />
                          {new Date(r.created_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}
                        </span>
                      </div>

                      {/* Assignment Task Status & Controls */}
                      <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {r.assigned_to_id ? (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.8rem', color: r.assigned_to_id === currentUser.id ? 'var(--accent-success)' : 'var(--text-secondary)', fontWeight: 600 }}>
                              📌 {r.assigned_to_id === currentUser.id ? 'You claimed this task' : `${r.assigned_to_name} is buying this`}
                            </span>
                            <button className="badge badge-danger" style={{ border: 'none', cursor: 'pointer' }} onClick={() => handleUnassignClick(r.id)}>
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <select 
                              className="form-input" 
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', width: 'auto', flex: 1, minWidth: '110px' }}
                              value={assigneeSelection[r.id] || currentUser.id}
                              onChange={(e) => handleAssigneeChange(r.id, e.target.value)}
                            >
                              {roommates?.map(rm => (
                                <option key={rm.id} value={rm.id}>{rm.name.split(' ')[0]}</option>
                              ))}
                            </select>
                            <button className="btn btn-primary btn-sm" style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }} onClick={() => handleAssignClick(r.id)}>
                              Select
                            </button>
                            <button className="btn btn-secondary btn-sm" style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }} onClick={() => onAssignRequest(r.id, currentUser.id)}>
                              Claim Myself
                            </button>
                          </div>
                        )}
                      </div>

                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No pending room requests! The pantry is in order.
                  </div>
                )}
              </div>
            </div>

            {/* Completed Requests Log */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '1.15rem' }}>Completed Purchases</h3>
                {unreadCompletedCount > 0 && (
                  <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                    {unreadCompletedCount} New Completed
                  </span>
                )}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '480px', overflowY: 'auto' }}>
                {completedRequests.length > 0 ? (
                  completedRequests.map(r => (
                    <div key={r.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.85rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.03)', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <h4 style={{ fontSize: '1.05rem', fontWeight: 700, textDecoration: 'line-through', color: 'var(--text-muted)' }}>{r.item_name}</h4>
                        <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <Check size={12} /> Bought
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Requested by {r.requested_by_name} • Fulfilled by <strong>{r.completed_by_name}</strong>
                      </div>
                      {r.completed_at && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          <Calendar size={12} />
                          Bought at: {new Date(r.completed_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No completed requests yet.
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* SHOPPING TASK SYSTEM VIEW */}
        {activeSubTab === 'shopping' && (
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>Shopping Tasks Assistant</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                When you go outside, you can easily view your claimed items and quickly purchase unassigned ones!
              </p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Group 1: My Claimed Tasks */}
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--accent-success)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  🛒 My Tasks ({myShoppingTasks.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {myShoppingTasks.length > 0 ? (
                    myShoppingTasks.map(r => (
                      <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem', borderRadius: '8px', background: 'var(--accent-success-glow)', border: '1px solid var(--accent-success)' }}>
                        <div>
                          <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{r.item_name}</h4>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Qty: {r.quantity ? `${r.quantity} ${r.unit}` : 'Any'} • Request: {r.requested_by_name}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => handleUnassignClick(r.id)} style={{ fontSize: '0.75rem' }}>
                            Unclaim
                          </button>
                          <button className="btn btn-success btn-sm" onClick={() => handleCheckoutClick(r)} style={{ fontSize: '0.75rem' }}>
                            <Check size={12} /> Bought
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', italic: 'true', paddingLeft: '0.5rem' }}>You have not selected/claimed any shopping tasks yet.</p>
                  )}
                </div>
              </div>

              {/* Group 2: Unassigned Tasks (Available to claim) */}
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>
                  Available Tasks ({unassignedShoppingTasks.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {unassignedShoppingTasks.length > 0 ? (
                    unassignedShoppingTasks.map(r => (
                      <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)' }}>
                        <div>
                          <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{r.item_name}</h4>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Qty: {r.quantity ? `${r.quantity} ${r.unit}` : 'Any'} • Request: {r.requested_by_name}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn btn-primary btn-sm" onClick={() => onAssignRequest(r.id, currentUser.id)} style={{ fontSize: '0.75rem' }}>
                            Claim Task
                          </button>
                          <button className="btn btn-success btn-sm" onClick={() => handleCheckoutClick(r)} style={{ fontSize: '0.75rem' }}>
                            Bought
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', italic: 'true', paddingLeft: '0.5rem' }}>No unassigned tasks.</p>
                  )}
                </div>
              </div>

              {/* Group 3: Assigned to Others */}
              {otherShoppingTasks.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    Assigned to Others ({otherShoppingTasks.length})
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {otherShoppingTasks.map(r => (
                      <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem', borderRadius: '8px', background: 'rgba(255,255,255,0.005)', border: '1px solid var(--border-color)', opacity: 0.75 }}>
                        <div>
                          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-muted)' }}>{r.item_name}</h4>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Qty: {r.quantity ? `${r.quantity} ${r.unit}` : 'Any'} • Assigned to: <strong>{r.assigned_to_name}</strong>
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => onAssignRequest(r.id, currentUser.id)} style={{ fontSize: '0.75rem' }}>
                            Take Over
                          </button>
                          <button className="btn btn-success btn-sm" onClick={() => handleCheckoutClick(r)} style={{ fontSize: '0.75rem' }}>
                            Bought
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </div>

      {/* New Request Modal */}
      {showRequestModal && (
        <div className="dialog-overlay">
          <form className="dialog-content" onSubmit={submitRequest}>
            <div className="dialog-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MessageSquare size={20} /> Add Room Request</h3>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowRequestModal(false)}>✕</button>
            </div>
            
            <div className="dialog-body">
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
                  <label className="form-label">Item / Product Name</label>
                  <button type="button" className="badge badge-primary" style={{ border: 'none', cursor: 'pointer' }} onClick={() => setIsCustomItem(!isCustomItem)}>
                    {isCustomItem ? 'Select predefined' : 'Type custom item'}
                  </button>
                </div>

                {isCustomItem ? (
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Enter requested product, e.g. Gas Cylinder"
                    value={customItem}
                    onChange={(e) => setCustomItem(e.target.value)}
                    required
                  />
                ) : (
                  <select className="form-input" value={itemName} onChange={handleItemChange}>
                    {PREDEFINED_ITEMS[category]?.map(item => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                    <option value="custom">-- Custom Item --</option>
                  </select>
                )}
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 2 }}>
                  <label className="form-label">Quantity Needed (Optional)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0.01"
                    placeholder="e.g. 2, 500"
                    className="form-input" 
                    value={qtyRequested}
                    onChange={(e) => setQtyRequested(e.target.value)}
                  />
                </div>
                {qtyRequested && (
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
                )}
              </div>
            </div>
            
            <div className="dialog-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowRequestModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Publish Request</button>
            </div>
          </form>
        </div>
      )}

      {/* Checkout Bought Item Modal */}
      {showCheckoutModal && checkoutItem && (
        <div className="dialog-overlay">
          <form className="dialog-content" onSubmit={submitCheckout}>
            <div className="dialog-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ShoppingCart size={20} /> Checkout: {checkoutItem.item_name}</h3>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowCheckoutModal(false)}>✕</button>
            </div>
            
            <div className="dialog-body">
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                Input final details to add an expense and automatically restock the inventory.
              </p>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 2 }}>
                  <label className="form-label">Quantity Actually Purchased</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0.01"
                    className="form-input" 
                    value={qtyPurchased}
                    onChange={(e) => setQtyPurchased(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Unit</label>
                  <input type="text" className="form-input" value={checkoutItem.unit || 'packets'} readOnly disabled />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Total Amount Spent (INR)</label>
                <div style={{ position: 'relative' }}>
                  <IndianRupee size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    placeholder="Amount spent in Rupees"
                    className="form-input" 
                    style={{ paddingLeft: '2.2rem' }}
                    value={amountSpent}
                    onChange={(e) => setAmountSpent(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select className="form-input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  <option value="common_fund">Paid from Common Fund</option>
                  <option value="out_of_pocket">Paid Out-of-Pocket by Purchaser</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Purchaser</label>
                <input type="text" className="form-input" value={currentUser?.name} readOnly disabled />
              </div>

              <div className="form-group">
                <label className="form-label">Notes (Optional)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={checkoutNotes}
                  onChange={(e) => setCheckoutNotes(e.target.value)}
                />
              </div>
            </div>
            
            <div className="dialog-footer">
              <button type="button" className="btn btn-secondary" onClick={() => {
                setShowCheckoutModal(false);
                setCheckoutItem(null);
              }}>Cancel</button>
              <button type="submit" className="btn btn-success">Complete Checkout</button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
