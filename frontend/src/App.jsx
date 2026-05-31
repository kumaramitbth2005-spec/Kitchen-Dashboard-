import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Package, 
  MessageSquare, 
  Clock, 
  BarChart2, 
  User, 
  LogOut, 
  Sun, 
  Moon,
  ChefHat,
  Bell
} from 'lucide-react';

// Subcomponents
import Dashboard from './components/Dashboard.jsx';
import Expenses from './components/Expenses.jsx';
import Inventory from './components/Inventory.jsx';
import Requests from './components/Requests.jsx';
import Timers from './components/Timers.jsx';
import Reports from './components/Reports.jsx';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('roomy_token') || '');
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState(localStorage.getItem('roomy_theme') || 'dark');
  const [toast, setToast] = useState(null);
  const [selectedRoommateId, setSelectedRoommateId] = useState(null);

  // Core Data Lists
  const [stats, setStats] = useState(null);
  const [roommates, setRoommates] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [requests, setRequests] = useState([]);
  const [inventory, setInventory] = useState([]);

  // Login Form State
  const [loginUsername, setLoginUsername] = useState('aman');
  const [loginPassword, setLoginPassword] = useState('password123');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Profile Edit State
  const [profileName, setProfileName] = useState('');
  const [profilePassword, setProfilePassword] = useState('');
  const [profileAvatar, setProfileAvatar] = useState('');
  const [profileMessage, setProfileMessage] = useState('');

  // Fetch Dashboard Stats & Requests (Polling)
  const refreshCoreData = async () => {
    if (!token) return;
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const [statsRes, rmRes, expRes, conRes, reqRes, invRes] = await Promise.all([
        fetch('/api/dashboard', { headers }),
        fetch('/api/roommates', { headers }),
        fetch('/api/expenses', { headers }),
        fetch('/api/contributions', { headers }),
        fetch('/api/requests', { headers }),
        fetch('/api/inventory', { headers })
      ]);

      if (statsRes.status === 403 || rmRes.status === 403) {
        // Token expired
        handleLogout();
        return;
      }

      const [statsData, rmData, expData, conData, reqData, invData] = await Promise.all([
        statsRes.json(),
        rmRes.json(),
        expRes.json(),
        conRes.json(),
        reqRes.json(),
        invRes.json()
      ]);

      setStats(statsData);
      setRoommates(rmData);
      setExpenses(expData);
      setContributions(conData);
      setInventory(invData);
      
      // Compare old requests with new requests for real-time notification
      if (requests.length > 0 && reqData.length > 0) {
        const completedDiff = reqData.filter(
          newR => newR.completed === 1 && 
          newR.is_read === 0 &&
          !requests.some(oldR => oldR.id === newR.id && oldR.completed === 1)
        );
        
        if (completedDiff.length > 0) {
          showToast(`🔔 Shopping finished! ${completedDiff[0].completed_by_name} bought ${completedDiff[0].item_name}!`);
        }
      }

      setRequests(reqData);
    } catch (e) {
      console.error('Error fetching core room data:', e);
    }
  };

  // Run initial fetch on login
  useEffect(() => {
    if (token) {
      // Get current profile
      fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(data => {
        setUser(data);
        setProfileName(data.name);
        setProfileAvatar(data.avatar_url);
      })
      .catch(() => handleLogout());
    }
  }, [token]);

  // Set up polling loop
  useEffect(() => {
    if (token) {
      refreshCoreData();
      const interval = setInterval(refreshCoreData, 10000); // Poll every 10s
      return () => clearInterval(interval);
    }
  }, [token]);

  // Apply Theme Mode class on HTML document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('roomy_theme', theme);
  }, [theme]);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      localStorage.setItem('roomy_token', data.token);
      setToken(data.token);
      setUser(data.user);
      setProfileName(data.user.name);
      setProfileAvatar(data.user.avatar_url);
      showToast(`Welcome back, ${data.user.name}!`);
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('roomy_token');
    setToken('');
    setUser(null);
    setStats(null);
    setRoommates([]);
    setExpenses([]);
    setContributions([]);
    setRequests([]);
    setInventory([]);
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // API Call: Log Expense
  const addExpense = async (payload) => {
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      
      showToast('🛍️ Purchase logged successfully!');
      refreshCoreData();
    } catch (e) {
      alert(e.message);
    }
  };

  // API Call: Edit Expense
  const editExpense = async (id, payload) => {
    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      
      showToast('✏️ Purchase updated successfully!');
      refreshCoreData();
    } catch (e) {
      alert(e.message);
    }
  };

  // API Call: Delete Expense
  const deleteExpense = async (id) => {
    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}` 
        }
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      
      showToast('🗑️ Purchase deleted successfully!');
      refreshCoreData();
    } catch (e) {
      alert(e.message);
    }
  };

  // API Call: Log Contribution
  const addContribution = async (payload) => {
    try {
      const res = await fetch('/api/contributions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      showToast('💳 Fund contribution added!');
      refreshCoreData();
    } catch (e) {
      alert(e.message);
    }
  };

  // API Call: Update Inventory
  const updateInventoryItem = async (id, payload) => {
    try {
      const res = await fetch(`/api/inventory/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      showToast('📦 Inventory levels adjusted!');
      refreshCoreData();
    } catch (e) {
      alert(e.message);
    }
  };

  // API Call: Log Request
  const addRequest = async (payload) => {
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      showToast('📌 Request posted to board!');
      refreshCoreData();
    } catch (e) {
      alert(e.message);
    }
  };

  // API Call: Checkout request (Complete Shopping Task)
  const completeRequest = async (id, payload) => {
    try {
      const res = await fetch(`/api/requests/${id}/complete`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      showToast('🛒 Shopping task checked out successfully!');
      refreshCoreData();
    } catch (e) {
      alert(e.message);
    }
  };

  // API Call: Assign/Claim Request
  const assignRequest = async (id, assigned_to_id) => {
    try {
      const res = await fetch(`/api/requests/${id}/assign`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ assigned_to_id })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      showToast('📌 Task assignment updated!');
      refreshCoreData();
    } catch (e) {
      alert(e.message);
    }
  };

  // API Call: Save profile settings
  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileMessage('');
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          name: profileName, 
          password: profilePassword || undefined,
          avatar_url: profileAvatar
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      setProfilePassword('');
      setProfileMessage('Settings saved successfully!');
      showToast('👤 Profile details updated');
      
      // Refetch user profile
      const userRes = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const userData = await userRes.json();
      setUser(userData);
    } catch (e) {
      setProfileMessage(e.message);
    }
  };

  // Unread Completed requests marker
  const clearNotifications = async () => {
    if (requests.filter(r => r.completed === 1 && r.is_read === 0).length === 0) return;
    try {
      await fetch('/api/requests/mark-read', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      refreshCoreData();
    } catch (e) {
      console.error(e);
    }
  };

  // Automatically clear notifications when request board tab is visited
  useEffect(() => {
    if (activeTab === 'requests') {
      clearNotifications();
    }
  }, [activeTab, requests]);

  // LOGIN SCREEN
  if (!token || !user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: '1rem' }}>
        <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '2rem' }}>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', padding: '0.85rem', borderRadius: '16px', background: 'var(--accent-primary-glow)', color: 'var(--accent-primary)', marginBottom: '0.75rem' }}>
              <ChefHat size={36} />
            </div>
            <h2 style={{ fontSize: '1.8rem', fontFamily: 'var(--font-display)', fontWeight: 800 }}>RoomyKitchen</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>Shared Room Kitchen & Contribution Manager</p>
          </div>

          {loginError && (
            <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'var(--accent-danger-glow)', border: '1px solid var(--accent-danger)', color: 'var(--accent-danger)', fontSize: '0.85rem', textAlign: 'center' }}>
              {loginError}
            </div>
          )}

          {/* Quick Roommate Selection Grid */}
          <div>
            <label className="form-label" style={{ textAlign: 'center', marginBottom: '0.75rem' }}>Select Roommate Profile</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
              {['aman', 'birju', 'chirag', 'dev', 'ehsan'].map(rm => (
                <button
                  key={rm}
                  type="button"
                  onClick={() => setLoginUsername(rm)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '20px',
                    border: '1px solid var(--border-color)',
                    background: loginUsername === rm ? 'var(--accent-primary-glow)' : 'var(--bg-secondary)',
                    color: loginUsername === rm ? 'var(--accent-primary)' : 'var(--text-primary)',
                    fontWeight: loginUsername === rm ? 700 : 500,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    transition: 'all 0.2s'
                  }}
                >
                  {rm}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Room Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Enter password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem', textAlign: 'center' }}>
                Default password for all roommates is <strong>password123</strong>
              </p>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '48px' }} disabled={loginLoading}>
              {loginLoading ? 'Entering Room...' : 'Enter Kitchen'}
            </button>
          </form>

        </div>
      </div>
    );
  }

  // MAIN LAYOUT
  const unreadCompletedCount = requests?.filter(r => r.completed === 1 && r.is_read === 0).length || 0;

  return (
    <div className="app-container">
      
      {/* Toast popup */}
      {toast && (
        <div className="toast">
          <Bell size={18} style={{ color: 'var(--accent-primary)' }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{toast}</span>
        </div>
      )}

      {/* Navigation Sidebar & Bottom Bar */}
      <aside className="nav-sidebar">
        <div className="nav-logo">
          <ChefHat size={28} />
          <span>RoomyKitchen</span>
        </div>

        <button 
          onClick={() => setActiveTab('dashboard')} 
          className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
        >
          <LayoutDashboard />
          <span>Dashboard</span>
        </button>

        <button 
          onClick={() => setActiveTab('expenses')} 
          className={`nav-link ${activeTab === 'expenses' ? 'active' : ''}`}
        >
          <ShoppingBag />
          <span>Ledger & Split</span>
        </button>

        <button 
          onClick={() => setActiveTab('inventory')} 
          className={`nav-link ${activeTab === 'inventory' ? 'active' : ''}`}
        >
          <Package />
          <span>Grocery stock</span>
        </button>

        <button 
          onClick={() => setActiveTab('requests')} 
          className={`nav-link ${activeTab === 'requests' ? 'active' : ''}`}
          style={{ position: 'relative' }}
        >
          <MessageSquare />
          <span>Coordination</span>
          {unreadCompletedCount > 0 && (
            <span style={{ 
              position: 'absolute', 
              top: '6px', 
              right: '25px', 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              background: 'var(--accent-success)' 
            }} />
          )}
        </button>

        <button 
          onClick={() => setActiveTab('timers')} 
          className={`nav-link ${activeTab === 'timers' ? 'active' : ''}`}
        >
          <Clock />
          <span>Kitchen Alarms</span>
        </button>

        <button 
          onClick={() => setActiveTab('reports')} 
          className={`nav-link ${activeTab === 'reports' ? 'active' : ''}`}
        >
          <BarChart2 />
          <span>Analytics</span>
        </button>

        <button 
          onClick={() => setActiveTab('profile')} 
          className={`nav-link ${activeTab === 'profile' ? 'active' : ''}`}
        >
          <User />
          <span>Profile</span>
        </button>

        <div className="nav-spacer" />

        <div className="nav-footer">
          {/* Theme Toggle Button */}
          <button 
            onClick={toggleTheme}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.5rem',
              width: '100%',
              gap: '0.5rem',
              fontSize: '0.85rem'
            }}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            <span style={{ display: 'none' }} className="desktop-inline">
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </span>
          </button>

          {/* Logout Button */}
          <button 
            onClick={handleLogout}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--accent-danger)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.5rem',
              width: '100%',
              gap: '0.5rem',
              fontSize: '0.85rem',
              marginTop: '0.5rem'
            }}
          >
            <LogOut size={18} />
            <span style={{ display: 'none' }} className="desktop-inline">Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main View Router */}
      <main className="main-content">
        {token && user && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Welcome,</span>
              <button 
                onClick={() => {
                  setActiveTab('dashboard');
                  setSelectedRoommateId(user.id);
                  setTimeout(() => {
                    const el = document.getElementById('roommate-balances-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }}
                className="badge badge-primary" 
                style={{ border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
              >
                <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'var(--accent-primary)', color: '#fff', fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  {user.avatar_url ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%' }} /> : user.name.substring(0,1).toUpperCase()}
                </div>
                <strong>{user.name}</strong> <span>(Click to Open Register)</span>
              </button>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              ⏰ Server Time: {new Date().toLocaleTimeString(undefined, {hour: '2-digit', minute:'2-digit'})}
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <Dashboard 
            stats={stats} 
            roommates={roommates} 
            onTabChange={setActiveTab} 
            currentUser={user}
            expenses={expenses}
            contributions={contributions}
            onAddExpense={addExpense}
            onAddContribution={addContribution}
            selectedRoommateId={selectedRoommateId}
            setSelectedRoommateId={setSelectedRoommateId}
          />
        )}
        
        {activeTab === 'expenses' && (
          <Expenses 
            roommates={roommates} 
            expenses={expenses} 
            contributions={contributions} 
            stats={stats}
            currentUser={user}
            onAddExpense={addExpense}
            onAddContribution={addContribution}
            onEditExpense={editExpense}
            onDeleteExpense={deleteExpense}
          />
        )}
        
        {activeTab === 'inventory' && (
          <Inventory 
            inventory={inventory} 
            onUpdateInventory={updateInventoryItem}
            onRefresh={refreshCoreData}
          />
        )}
        
        {activeTab === 'requests' && (
          <Requests 
            requests={requests}
            roommates={roommates}
            currentUser={user}
            onAddRequest={addRequest}
            onCompleteRequest={completeRequest}
            onAssignRequest={assignRequest}
          />
        )}
        
        {activeTab === 'timers' && (
          <Timers />
        )}
        
        {activeTab === 'reports' && (
          <Reports />
        )}

        {activeTab === 'profile' && (
          <div className="glass-card animate-fade-in" style={{ maxWidth: '520px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '1.6rem', marginBottom: '1.25rem' }}>Edit Roommate Settings</h2>
            
            {profileMessage && (
              <div className="badge badge-primary" style={{ display: 'block', padding: '0.75rem', width: '100%', textAlign: 'center', marginBottom: '1.25rem' }}>
                {profileMessage}
              </div>
            )}

            <form onSubmit={handleProfileSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={profileName} 
                  onChange={(e) => setProfileName(e.target.value)} 
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Change Password</label>
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="Enter new password (optional)"
                  value={profilePassword} 
                  onChange={(e) => setProfilePassword(e.target.value)} 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Avatar URL (Optional)</label>
                <input 
                  type="url" 
                  className="form-input" 
                  placeholder="e.g. image link, or leave blank to use initials"
                  value={profileAvatar} 
                  onChange={(e) => setProfileAvatar(e.target.value)} 
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

    </div>
  );
}
