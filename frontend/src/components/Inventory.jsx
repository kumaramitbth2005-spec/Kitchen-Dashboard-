import React, { useState } from 'react';
import { Edit3, AlertTriangle, CheckCircle, Package, ArrowDown, ArrowUp, RefreshCw } from 'lucide-react';

const ITEM_IMAGES = {
  // Grains
  'Rice': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&auto=format&fit=crop&q=60',
  'Wheat Flour': 'https://images.unsplash.com/photo-1574316071802-0d684efa7bf5?w=400&auto=format&fit=crop&q=60',
  'Poha': 'https://images.unsplash.com/photo-1626132647523-66f5bf380027?w=400&auto=format&fit=crop&q=60',
  'Suji': 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400&auto=format&fit=crop&q=60',
  // Pulses (Dal) - Corrected to actual lentils/beans photos
  'Arhar Dal': 'https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?w=400&auto=format&fit=crop&q=60',
  'Masoor Dal': 'https://images.unsplash.com/photo-1515942400756-12822287e6a4?w=400&auto=format&fit=crop&q=60',
  'Moong Dal': 'https://images.unsplash.com/photo-1515942400756-12822287e6a4?w=400&auto=format&fit=crop&q=60',
  'Chana Dal': 'https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?w=400&auto=format&fit=crop&q=60',
  'Urad Dal': 'https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?w=400&auto=format&fit=crop&q=60',
  // Vegetables - Corrected to actual garlic, ginger, and green chilli photos
  'Potato': 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&auto=format&fit=crop&q=60',
  'Onion': 'https://images.unsplash.com/photo-1508747703725-719777637510?w=400&auto=format&fit=crop&q=60',
  'Tomato': 'https://images.unsplash.com/photo-1595855759920-86582396756a?w=400&auto=format&fit=crop&q=60',
  'Garlic': 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&auto=format&fit=crop&q=60',
  'Ginger': 'https://images.unsplash.com/photo-1617686966121-927429b2f627?w=400&auto=format&fit=crop&q=60',
  'Green Chilli': 'https://images.unsplash.com/photo-1588252396155-22e6b228f4de?w=400&auto=format&fit=crop&q=60',
  // Spices - Corrected to spice arrays and seeds
  'Turmeric': 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400&auto=format&fit=crop&q=60',
  'Red Chilli Powder': 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&auto=format&fit=crop&q=60',
  'Coriander Powder': 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&auto=format&fit=crop&q=60',
  'Garam Masala': 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&auto=format&fit=crop&q=60',
  'Cumin': 'https://images.unsplash.com/photo-1608797178974-15b35a61d121?w=400&auto=format&fit=crop&q=60',
  'Mustard Seeds': 'https://images.unsplash.com/photo-1608797178974-15b35a61d121?w=400&auto=format&fit=crop&q=60',
  // Oils & Others
  'Cooking Oil': 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&auto=format&fit=crop&q=60',
  'Salt': 'https://images.unsplash.com/photo-1618013358993-c151240c554a?w=400&auto=format&fit=crop&q=60',
  'Sugar': 'https://images.unsplash.com/photo-1580637207681-795c37b2f216?w=400&auto=format&fit=crop&q=60',
  'Tea': 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400&auto=format&fit=crop&q=60',
  'Milk': 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&auto=format&fit=crop&q=60'
};

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=60';

export default function Inventory({ inventory, onUpdateInventory, onRefresh }) {
  const [selectedItem, setSelectedItem] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editQty, setEditQty] = useState('');
  const [editMin, setEditMin] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');

  const categories = ['All', 'Grains', 'Pulses (Dal)', 'Vegetables', 'Spices', 'Oils & Others'];

  const handleEditClick = (item) => {
    setSelectedItem(item);
    setEditQty(item.quantity_available);
    setEditMin(item.min_stock_level);
    setShowEditModal(true);
  };

  const handleQuickAdjust = (item, delta) => {
    const newQty = Math.max(0, item.quantity_available + delta);
    onUpdateInventory(item.id, {
      quantity_available: parseFloat(newQty.toFixed(2)),
      min_stock_level: item.min_stock_level
    });
  };

  const submitEdit = (e) => {
    e.preventDefault();
    if (editQty === '' || editMin === '') {
      alert('Please fill out all fields.');
      return;
    }
    
    onUpdateInventory(selectedItem.id, {
      quantity_available: parseFloat(editQty),
      min_stock_level: parseFloat(editMin)
    });
    
    setShowEditModal(false);
    setSelectedItem(null);
  };

  const getStockStatus = (item) => {
    if (item.quantity_available === 0) return { label: 'Out of Stock', type: 'danger' };
    if (item.quantity_available < item.min_stock_level) return { label: 'Low Stock', type: 'warning' };
    return { label: 'In Stock', type: 'success' };
  };

  // Group and filter inventory items
  const filteredInventory = filterCategory === 'All' 
    ? inventory 
    : inventory.filter(item => item.category === filterCategory);

  const lowStockCount = inventory?.filter(item => item.quantity_available < item.min_stock_level).length || 0;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Kitchen Inventory</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Monitor grocery stock levels. Low stock automatically adds items to the Shopping Request Board.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={onRefresh} style={{ padding: '0.5rem' }}>
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Warning Banner */}
      {lowStockCount > 0 && (
        <div style={{ display: 'flex', gap: '0.75rem', padding: '1rem', borderRadius: '12px', background: 'var(--accent-warning-glow)', border: '1px solid var(--accent-warning)', alignItems: 'center' }}>
          <AlertTriangle style={{ color: 'var(--accent-warning)', flexShrink: 0 }} />
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <strong>{lowStockCount} Items are Low Stock!</strong> Roommates have consumed these groceries past safety margins. Stock requests have been added to the board.
          </div>
        </div>
      )}

      {/* Category Tabs Filter */}
      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`btn btn-sm ${filterCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: '20px', whiteSpace: 'nowrap' }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Inventory Grid */}
      <div className="grid-cols-1 grid-cols-2 grid-cols-3 grid-cols-4" style={{ gap: '1.25rem' }}>
        {filteredInventory && filteredInventory.length > 0 ? (
          filteredInventory.map(item => {
            const status = getStockStatus(item);
            const deltaRatio = Math.min(100, Math.max(0, (item.quantity_available / (item.min_stock_level || 1)) * 100));
            
            return (
              <div key={item.id} className="glass-card interactive" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: `4px solid ${status.type === 'danger' ? 'var(--accent-danger)' : status.type === 'warning' ? 'var(--accent-warning)' : 'var(--accent-success)'}`, padding: '1rem' }}>
                
                {/* Responsive Product Cover Image */}
                <div style={{ width: '100%', height: '110px', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
                  <img 
                    src={ITEM_IMAGES[item.item_name] || DEFAULT_IMAGE} 
                    alt={item.item_name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    loading="lazy"
                  />
                  <div style={{ position: 'absolute', bottom: '6px', left: '6px', fontSize: '0.7rem', padding: '2px 8px', background: 'rgba(0,0,0,0.6)', color: '#fff', borderRadius: '10px', fontWeight: 600, backdropFilter: 'blur(2px)' }}>
                    {item.category}
                  </div>
                </div>

                {/* Item Details */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{item.item_name}</h3>
                  <span className={`badge badge-${status.type}`}>
                    {status.label}
                  </span>
                </div>

                {/* Stock Counts */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0.5rem 0' }}>
                  <div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Available Stock</p>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {item.quantity_available} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-secondary)' }}>{item.unit}</span>
                    </h2>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Min Threshold</p>
                    <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {item.min_stock_level} {item.unit}
                    </p>
                  </div>
                </div>

                {/* Stock Level Slider indicator */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span>Stock Ratio</span>
                    <span>{deltaRatio.toFixed(0)}%</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${deltaRatio}%`, 
                      height: '100%', 
                      background: status.type === 'danger' ? 'var(--accent-danger)' : status.type === 'warning' ? 'var(--accent-warning)' : 'var(--accent-success)',
                      borderRadius: '3px'
                    }} />
                  </div>
                </div>

                {/* Adjust Stock Buttons */}
                <div style={{ display: 'flex', justifyItems: 'stretch', gap: '0.5rem', marginTop: 'auto', pt: '0.5rem' }}>
                  <button 
                    className="btn btn-secondary btn-sm" 
                    style={{ flex: 1, padding: '0.35rem 0' }}
                    onClick={() => handleQuickAdjust(item, item.unit === 'g' ? -100 : item.unit === 'litre' || item.unit === 'kg' ? -0.5 : -1)}
                  >
                    <ArrowDown size={14} /> -{item.unit === 'g' ? '100g' : item.unit === 'litre' || item.unit === 'kg' ? '0.5' : '1'}
                  </button>
                  
                  <button 
                    className="btn btn-secondary btn-sm" 
                    style={{ flex: 1, padding: '0.35rem 0' }}
                    onClick={() => handleQuickAdjust(item, item.unit === 'g' ? 100 : item.unit === 'litre' || item.unit === 'kg' ? 0.5 : 1)}
                  >
                    <ArrowUp size={14} /> +{item.unit === 'g' ? '100g' : item.unit === 'litre' || item.unit === 'kg' ? '0.5' : '1'}
                  </button>

                  <button 
                    className="btn btn-secondary btn-sm" 
                    style={{ padding: '0.35rem 0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={() => handleEditClick(item)}
                    title="Edit custom levels"
                  >
                    <Edit3 size={14} />
                  </button>
                </div>

              </div>
            );
          })
        ) : (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No inventory items matching this category.
          </div>
        )}
      </div>

      {/* Edit Inventory Modal */}
      {showEditModal && selectedItem && (
        <div className="dialog-overlay">
          <form className="dialog-content" onSubmit={submitEdit}>
            <div className="dialog-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Package size={20} /> Edit {selectedItem.item_name} Levels</h3>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowEditModal(false)}>✕</button>
            </div>
            
            <div className="dialog-body">
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                Adjust current availability and minimum stock thresholds for this item.
              </p>
              
              <div className="form-group">
                <label className="form-label">Available Quantity ({selectedItem.unit})</label>
                <input 
                  type="number" 
                  step="0.01"
                  min="0"
                  className="form-input" 
                  value={editQty}
                  onChange={(e) => setEditQty(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Minimum Safety Threshold ({selectedItem.unit})</label>
                <input 
                  type="number" 
                  step="0.01"
                  min="0.01"
                  className="form-input" 
                  value={editMin}
                  onChange={(e) => setEditMin(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className="dialog-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save Changes</button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
