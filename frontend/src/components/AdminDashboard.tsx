import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

interface User { id: string; full_name: string; email: string; role: string; department: string | null; }
interface Counter { id: string; name: string; }
interface QueueItem { 
  student_name?: string; 
  ticket_number?: string; 
  studentName?: string; 
  ticketNumber?: string; 
  timestamp: string; 
  counter_name?: string; 
  completed_at?: string; 
  status?: string; 
}

const AdminDashboard = () => {
  const [user] = useState(JSON.parse(localStorage.getItem('user') || '{}'));
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'counters' | 'history'>('stats');
  const [users, setUsers] = useState<User[]>([]);
  const [counters, setCounters] = useState<Counter[]>([]);
  const [selectedQueue, setSelectedQueue] = useState<QueueItem[]>([]);
  const [history, setHistory] = useState<QueueItem[]>([]);
  const [viewingCounter, setViewingCounter] = useState<string | null>(null);
  const [queueCounts, setQueueCounts] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [filterDept, setFilterDept] = useState<string | 'All'>('All');
  const [newCounterName, setNewCounterName] = useState('');
  const [historyCounterFilter, setHistoryCounterFilter] = useState<string>('All');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const navigate = useNavigate();

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, countersRes] = await Promise.all([
        axios.get('http://localhost:5000/api/users'),
        axios.get('http://localhost:5000/api/counters')
      ]);
      setUsers(usersRes.data);
      setCounters(countersRes.data);
      fetchQueueCounts(countersRes.data);
    } catch (err) {
      console.error("Gabim gjatë marrjes së të dhënave:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (date: string) => {
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:5000/api/history?date=${date}`);
      setHistory(res.data);
    } catch (err) {
      console.error("Gabim në histori:", err);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (activeTab === 'stats' && counters.length > 0) {
      const interval = setInterval(() => fetchQueueCounts(counters), 5000);
      return () => clearInterval(interval);
    }
  }, [activeTab, counters]);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory(selectedDate);
    }
  }, [activeTab, selectedDate]);

  const fetchQueueCounts = async (counterList: Counter[]) => {
    try {
      const counts: { [key: string]: number } = {};
      await Promise.all(
        counterList.map(async (c) => {
          const res = await axios.get(`http://localhost:5000/api/queue-status/${encodeURIComponent(c.name)}`);
          counts[c.name] = res.data.count || 0;
        })
      );
      setQueueCounts(counts);
    } catch (err) {
      console.error("Gabim gjatë marrjes së numrave:", err);
    }
  };

  const fetchQueueDetails = async (counterName: string) => {
    setViewingCounter(counterName);
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:5000/api/queue/${counterName}`);
      setSelectedQueue(res.data);
    } catch (err) {
      setSelectedQueue([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCounter = async () => {
    if (!newCounterName.trim()) return;
    await axios.post('http://localhost:5000/api/counters', { name: newCounterName });
    setNewCounterName('');
    toast.success('Sporteli u shtua me sukses!');
    fetchData();
  };

  const handleDeleteCounter = async (id: string, name: string) => {
    if (window.confirm(`A jeni i sigurt që dëshironi të fshini sportelin ${name}?`)) {
      await axios.delete(`http://localhost:5000/api/counters/${id}`);
      toast.success('Sporteli u fshi!');
      fetchData();
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setSelectedRole(user.role);
    setSelectedDept(user.department);
    setIsModalOpen(true);
  };

  const saveUserChanges = async () => {
    if (!selectedUser) return;
    const deptToSave = selectedRole === 'staf-admin' ? selectedDept : null;
    try {
      await axios.put('http://localhost:5000/api/update-user-role', {
        userId: selectedUser.id,
        role: selectedRole,
        department: deptToSave
      });
      setIsModalOpen(false);
      toast.success('Ndryshimet u ruajtën!');
      fetchData();
    } catch (err) {
      toast.error("Gabim gjatë përditësimit!");
    }
  };

  const totalWaiting = Object.values(queueCounts).reduce((a, b) => a + b, 0);

  const getStatusBadge = (status?: string) => {
    const base: React.CSSProperties = {
      padding: '5px 14px',
      borderRadius: '20px',
      color: '#fff',
      fontSize: '12px',
      fontWeight: '700',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      letterSpacing: '0.3px',
    };
    if (status === 'no-show') return { ...base, background: 'linear-gradient(135deg, #ef4444, #dc2626)' };
    if (status === 'cancelled') return { ...base, background: 'linear-gradient(135deg, #f59e0b, #d97706)' };
    return { ...base, background: 'linear-gradient(135deg, #10b981, #059669)' };
  };

  const getStatusText = (status?: string) => {
    if (status === 'no-show') return 'Nuk erdhi ❌';
    if (status === 'cancelled') return 'Anuluar 🚫';
    return 'I Kryer ✅';
  };

  const navItems = [
    { key: 'stats', icon: '📊', label: 'Monitorimi Live' },
    { key: 'history', icon: '📜', label: 'Historia e Punës' },
    { key: 'users', icon: '👥', label: 'Përdoruesit' },
    { key: 'counters', icon: '🖥️', label: 'Sportelet' },
  ];

  return (
    <div style={s.app}>
      {/* SIDEBAR */}
      <aside style={s.sidebar}>
        <div style={s.sidebarInner}>
          <div style={s.logoArea}>
            <div style={s.logoMark}>⚡</div>
            <div>
              <h2 style={s.logoTitle}>QueueFlow</h2>
              <p style={s.logoSub}>Admin Panel</p>
            </div>
          </div>

          <nav style={s.nav}>
            {navItems.map(item => (
              <div
                key={item.key}
                style={activeTab === item.key ? s.navActive : s.navBtn}
                onClick={() => { setActiveTab(item.key as any); setViewingCounter(null); if (item.key === 'users') setFilterDept('All'); }}
              >
                <span style={s.navIcon}>{item.icon}</span>
                <span>{item.label}</span>
                {item.key === 'stats' && totalWaiting > 0 && (
                  <span style={s.navBadge}>{totalWaiting}</span>
                )}
              </div>
            ))}
          </nav>

          <div style={s.sidebarFooter}>
            <div style={s.userInfo}>
              <div style={s.userAvatar}>
                {(user.full_name || 'A').charAt(0).toUpperCase()}
              </div>
              <div>
                <p style={s.userName}>{user.full_name || 'Admin'}</p>
                <p style={s.userRole}>Administrator</p>
              </div>
            </div>
            <div 
              onClick={() => { localStorage.clear(); navigate('/login'); }} 
              style={s.logoutBtn}
            >
              🚪 Dil nga Sistemi
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main style={s.main}>
        {loading ? (
          <div style={s.loader}>
            <div style={s.loaderSpinner}>⟳</div>
            <p>Duke u ngarkuar...</p>
          </div>
        ) : (
          <>
            {/* STATS / MONITORING */}
            {activeTab === 'stats' && (
              <div style={s.fadeIn}>
                <div style={s.pageHeader}>
                  <div>
                    <h1 style={s.pageTitle}>{viewingCounter ? `Detajet: ${viewingCounter}` : 'Qendra e Monitorimit'}</h1>
                    <p style={s.pageDesc}>{viewingCounter ? 'Lista e nxënësve në pritje' : 'Monitoroni radhët e të gjitha sporteleve në kohë reale'}</p>
                  </div>
                  {viewingCounter && (
                    <button onClick={() => setViewingCounter(null)} style={s.backBtn}>
                      ← Kthehu
                    </button>
                  )}
                </div>

                {!viewingCounter ? (
                  <>
                    {/* Summary Cards */}
                    <div style={s.summaryRow}>
                      <div style={s.summaryCard}>
                        <div style={{...s.summaryIcon, background: 'linear-gradient(135deg, #1FBBA6, #14917e)'}}>📊</div>
                        <div>
                          <p style={s.summaryLabel}>Sportele Aktive</p>
                          <h3 style={s.summaryValue}>{counters.length}</h3>
                        </div>
                      </div>
                      <div style={s.summaryCard}>
                        <div style={{...s.summaryIcon, background: 'linear-gradient(135deg, #3b82f6, #2563eb)'}}>👥</div>
                        <div>
                          <p style={s.summaryLabel}>Në Pritje Total</p>
                          <h3 style={s.summaryValue}>{totalWaiting}</h3>
                        </div>
                      </div>
                      <div style={s.summaryCard}>
                        <div style={{...s.summaryIcon, background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)'}}>📋</div>
                        <div>
                          <p style={s.summaryLabel}>Përdorues Regjistruar</p>
                          <h3 style={s.summaryValue}>{users.length}</h3>
                        </div>
                      </div>
                    </div>

                    {/* Queue Cards */}
                    <div style={s.queueGrid}>
                      {counters.map(c => {
                        const count = queueCounts[c.name] || 0;
                        return (
                          <div key={c.id} style={s.queueCard} onClick={() => fetchQueueDetails(c.name)}>
                            <div style={s.queueCardHeader}>
                              <h3 style={s.queueCardTitle}>{c.name}</h3>
                              <div style={{
                                ...s.liveDot,
                                background: count > 0 ? '#10b981' : '#94a3b8',
                                boxShadow: count > 0 ? '0 0 8px rgba(16, 185, 129, 0.5)' : 'none',
                              }}>
                                <span style={{fontSize: '10px', color: count > 0 ? '#10b981' : '#94a3b8', fontWeight: '700', marginLeft: '14px', whiteSpace: 'nowrap'}}>{count > 0 ? 'AKTIV' : 'BOSH'}</span>
                              </div>
                            </div>
                            <div style={s.queueCardBody}>
                              <h2 style={{
                                ...s.queueCount,
                                color: count > 0 ? '#1FBBA6' : '#cbd5e1',
                              }}>{count}</h2>
                              <p style={s.queueCountLabel}>nxënës në pritje</p>
                            </div>
                            <div style={s.queueCardFooter}>
                              <span style={{fontSize: '13px', color: '#64748b'}}>Kliko për detaje →</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div style={s.contentCard}>
                    <table style={s.table}>
                      <thead>
                        <tr>
                          <th style={s.th}>#</th>
                          <th style={s.th}>Bileta</th>
                          <th style={s.th}>Emri i Nxënësit</th>
                          <th style={s.th}>Koha</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedQueue.length > 0 ? selectedQueue.map((q, i) => (
                          <tr key={i} style={s.tr}>
                            <td style={s.td}><span style={s.rowNum}>{i + 1}</span></td>
                            <td style={{...s.td, fontWeight: '700', color: '#1FBBA6'}}>#{q.ticketNumber}</td>
                            <td style={s.td}>{q.studentName}</td>
                            <td style={{...s.td, color: '#94a3b8'}}>{new Date(q.timestamp).toLocaleTimeString()}</td>
                          </tr>
                        )) : (
                          <tr><td colSpan={4} style={s.emptyRow}>Nuk ka nxënës në radhë për momentin.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* HISTORY */}
            {activeTab === 'history' && (
              <div style={s.fadeIn}>
                <div style={s.pageHeader}>
                  <div>
                    <h1 style={s.pageTitle}>Arkiva e Radhëve</h1>
                    <p style={s.pageDesc}>Shikoni historinë e plotë të biletave dhe shërbimeve</p>
                  </div>
                  <div style={s.filterRow}>
                    <div style={s.filterGroup}>
                      <label style={s.filterLabel}>Sporteli:</label>
                      <select 
                        style={s.filterSelect} 
                        value={historyCounterFilter} 
                        onChange={(e) => setHistoryCounterFilter(e.target.value)}
                      >
                        <option value="All">Të Gjithë</option>
                        {counters.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>
                    <div style={s.filterGroup}>
                      <label style={s.filterLabel}>Data:</label>
                      <input 
                        type="date" 
                        style={s.filterDate} 
                        value={selectedDate} 
                        onChange={(e) => setSelectedDate(e.target.value)} 
                      />
                    </div>
                  </div>
                </div>

                <div style={s.contentCard}>
                  <table style={s.table}>
                    <thead>
                      <tr>
                        <th style={s.th}>Bileta</th>
                        <th style={s.th}>Emri i Nxënësit</th>
                        <th style={s.th}>Sporteli</th>
                        <th style={s.th}>Koha</th>
                        <th style={s.th}>Statusi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history
                        .filter(h => historyCounterFilter === 'All' || h.counter_name === historyCounterFilter)
                        .length > 0 ? history
                          .filter(h => historyCounterFilter === 'All' || h.counter_name === historyCounterFilter)
                          .map((h, i) => (
                            <tr key={i} style={s.tr}>
                              <td style={{...s.td, fontWeight: '700'}}>#{h.ticket_number || h.ticketNumber}</td>
                              <td style={s.td}>{h.student_name || h.studentName}</td>
                              <td style={s.td}>
                                <span style={s.counterTag}>{h.counter_name}</span>
                              </td>
                              <td style={{...s.td, color: '#94a3b8'}}>{new Date(h.completed_at || h.timestamp).toLocaleTimeString()}</td>
                              <td style={s.td}>
                                <span style={getStatusBadge(h.status)}>
                                  {getStatusText(h.status)}
                                </span>
                              </td>
                            </tr>
                          )) : (
                          <tr><td colSpan={5} style={s.emptyRow}>Nuk ka rekorde për këto filtra.</td></tr>
                        )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* USERS */}
            {activeTab === 'users' && (
              <div style={s.fadeIn}>
                <div style={s.pageHeader}>
                  <div>
                    <h1 style={s.pageTitle}>{filterDept === 'All' ? 'Menaxhimi i Përdoruesve' : `Stafi: ${filterDept}`}</h1>
                    <p style={s.pageDesc}>Menaxhoni rolet dhe sportelet e stafit</p>
                  </div>
                  {filterDept !== 'All' && <button onClick={() => setFilterDept('All')} style={s.backBtn}>Hiq Filtrin ✕</button>}
                </div>

                <div style={s.contentCard}>
                  <table style={s.table}>
                    <thead>
                      <tr>
                        <th style={s.th}>Emri</th>
                        <th style={s.th}>Email</th>
                        <th style={s.th}>Roli</th>
                        <th style={s.th}>Sporteli</th>
                        <th style={s.th}>Veprim</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.filter(u => filterDept === 'All' || u.department === filterDept).map(u => (
                        <tr key={u.id} style={s.tr}>
                          <td style={s.td}>
                            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                              <div style={s.tableAvatar}>{(u.full_name || '?').charAt(0).toUpperCase()}</div>
                              <span style={{fontWeight: '600'}}>{u.full_name}</span>
                            </div>
                          </td>
                          <td style={{...s.td, color: '#64748b'}}>{u.email}</td>
                          <td style={s.td}>
                            <span style={{
                              ...s.roleBadge,
                              background: u.role === 'admin' ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 
                                         u.role === 'staf-admin' ? 'linear-gradient(135deg, #1FBBA6, #14917e)' : 
                                         'linear-gradient(135deg, #64748b, #475569)',
                            }}>
                              {u.role}
                            </span>
                          </td>
                          <td style={s.td}>
                            {u.department ? <span style={s.counterTag}>{u.department}</span> : <span style={{color: '#cbd5e1'}}>—</span>}
                          </td>
                          <td style={s.td}>
                            <button style={s.editBtn} onClick={() => openEditModal(u)}>
                              ⚙️ Ndrysho
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* COUNTERS */}
            {activeTab === 'counters' && (
              <div style={s.fadeIn}>
                <div style={s.pageHeader}>
                  <div>
                    <h1 style={s.pageTitle}>Menaxhimi i Sporteleve</h1>
                    <p style={s.pageDesc}>Shtoni ose fshini sportelet e shërbimit</p>
                  </div>
                </div>

                <div style={s.contentCard}>
                  <div style={s.addRow}>
                    <input 
                      style={s.addInput} 
                      value={newCounterName} 
                      onChange={e => setNewCounterName(e.target.value)} 
                      placeholder="Emri i sportelit të ri..." 
                      onKeyDown={e => e.key === 'Enter' && handleAddCounter()}
                    />
                    <button style={s.addBtn} onClick={handleAddCounter}>
                      + Shto Sportel
                    </button>
                  </div>

                  <div style={s.counterGrid}>
                    {counters.map(c => (
                      <div key={c.id} style={s.counterCard}>
                        <div style={s.counterCardLeft}>
                          <div style={s.counterCardIcon}>🖥️</div>
                          <div>
                            <p style={s.counterCardName}>{c.name}</p>
                            <p style={s.counterCardSub}>{queueCounts[c.name] || 0} në pritje</p>
                          </div>
                        </div>
                        <button style={s.deleteBtn} onClick={() => handleDeleteCounter(c.id, c.name)}>
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* MODAL */}
      {isModalOpen && selectedUser && (
        <div style={s.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>Menaxho Përdoruesin</h3>
              <button style={s.modalClose} onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <div style={s.modalUserInfo}>
              <div style={s.modalAvatar}>{(selectedUser.full_name || '?').charAt(0).toUpperCase()}</div>
              <p style={s.modalUserName}>{selectedUser.full_name}</p>
              <p style={s.modalUserEmail}>{selectedUser.email}</p>
            </div>

            <div style={s.modalBody}>
              <div style={s.modalField}>
                <label style={s.modalLabel}>Roli:</label>
                <select style={s.modalSelect} value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
                  <option value="nxenes">Nxënës</option>
                  <option value="staf-admin">Staf Admin</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {selectedRole === 'staf-admin' && (
                <div style={s.modalField}>
                  <label style={s.modalLabel}>Cakto Sportelin:</label>
                  <div style={s.counterPills}>
                    {counters.map(c => (
                      <button 
                        key={c.id} 
                        onClick={() => setSelectedDept(c.name)} 
                        style={{
                          ...s.pill,
                          background: selectedDept === c.name ? 'linear-gradient(135deg, #1FBBA6, #14917e)' : '#f1f5f9',
                          color: selectedDept === c.name ? '#fff' : '#475569',
                          borderColor: selectedDept === c.name ? '#1FBBA6' : '#e2e8f0',
                        }}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={s.modalActions}>
              <button style={s.modalSaveBtn} onClick={saveUserChanges}>Ruaj Ndryshimet</button>
              <button onClick={() => setIsModalOpen(false)} style={s.modalCancelBtn}>Anulo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const s: { [key: string]: React.CSSProperties } = {
  app: { display: 'flex', height: '100vh', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", background: '#f1f5f9' },
  
  // Sidebar
  sidebar: { width: '280px', background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)', display: 'flex', flexDirection: 'column', flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.05)' },
  sidebarInner: { display: 'flex', flexDirection: 'column', height: '100%', padding: '0' },
  logoArea: { display: 'flex', alignItems: 'center', gap: '14px', padding: '28px 24px 35px', borderBottom: '1px solid rgba(255,255,255,0.06)' },
  logoMark: { background: 'linear-gradient(135deg, #1FBBA6, #14917e)', padding: '10px 14px', borderRadius: '14px', fontSize: '22px' },
  logoTitle: { color: '#f8fafc', margin: 0, fontSize: '20px', fontWeight: '800', letterSpacing: '-0.3px' },
  logoSub: { color: '#64748b', margin: 0, fontSize: '12px', fontWeight: '500' },
  
  nav: { flex: 1, padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '4px' },
  navBtn: { display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 16px', color: '#94a3b8', borderRadius: '12px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', transition: 'all 0.15s', position: 'relative' },
  navActive: { display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 16px', background: 'linear-gradient(135deg, rgba(31,187,166,0.15), rgba(31,187,166,0.05))', color: '#1FBBA6', borderRadius: '12px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', border: '1px solid rgba(31,187,166,0.2)', position: 'relative' },
  navIcon: { fontSize: '18px', width: '24px', textAlign: 'center' },
  navBadge: { marginLeft: 'auto', background: '#ef4444', color: '#fff', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '10px' },
  
  sidebarFooter: { padding: '20px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' },
  userInfo: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', padding: '0 4px' },
  userAvatar: { width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #1FBBA6, #14917e)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '700', fontSize: '14px' },
  userName: { margin: 0, color: '#e2e8f0', fontWeight: '600', fontSize: '13px' },
  userRole: { margin: 0, color: '#64748b', fontSize: '11px' },
  logoutBtn: { textAlign: 'center', color: '#f87171', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', padding: '10px', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', transition: 'all 0.15s' },

  // Main
  main: { flex: 1, padding: '32px 40px', overflowY: 'auto', background: '#f8fafc' },
  loader: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', gap: '12px' },
  loaderSpinner: { fontSize: '32px', animation: 'spin 1s linear infinite' },
  fadeIn: { animation: 'fadeIn 0.3s ease-out' },

  // Page Header
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px', flexWrap: 'wrap', gap: '16px' },
  pageTitle: { fontSize: '28px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-0.5px' },
  pageDesc: { color: '#64748b', margin: 0, fontSize: '14px' },
  backBtn: { padding: '10px 20px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', color: '#475569', transition: 'all 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },

  // Summary Cards
  summaryRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '28px' },
  summaryCard: { background: '#fff', borderRadius: '16px', padding: '22px 24px', display: 'flex', alignItems: 'center', gap: '18px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9' },
  summaryIcon: { width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 },
  summaryLabel: { margin: 0, color: '#94a3b8', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' },
  summaryValue: { margin: '2px 0 0', fontSize: '28px', fontWeight: '800', color: '#0f172a' },

  // Queue Grid
  queueGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' },
  queueCard: { background: '#fff', borderRadius: '16px', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9' },
  queueCardHeader: { padding: '18px 22px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  queueCardTitle: { margin: 0, fontSize: '16px', fontWeight: '700', color: '#1e293b' },
  liveDot: { width: '8px', height: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', flexShrink: 0 },
  queueCardBody: { padding: '15px 22px 10px', textAlign: 'center' },
  queueCount: { fontSize: '52px', fontWeight: '900', margin: '0', lineHeight: '1.1' },
  queueCountLabel: { color: '#94a3b8', fontSize: '13px', margin: '4px 0 0' },
  queueCardFooter: { padding: '14px 22px', borderTop: '1px solid #f8fafc', textAlign: 'center' },

  // Content Card & Table
  contentCard: { background: '#fff', borderRadius: '16px', padding: '0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '14px 20px', borderBottom: '2px solid #f1f5f9', color: '#94a3b8', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', background: '#fafbfc' },
  td: { padding: '14px 20px', borderBottom: '1px solid #f8fafc', fontSize: '14px', color: '#334155' },
  tr: { transition: 'background 0.1s' },
  emptyRow: { textAlign: 'center', padding: '40px 20px', color: '#94a3b8', fontSize: '14px' },
  rowNum: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '8px', background: '#f1f5f9', fontSize: '12px', fontWeight: '700', color: '#64748b' },
  
  counterTag: { display: 'inline-block', padding: '4px 12px', borderRadius: '8px', background: '#f0fdf4', color: '#16a34a', fontSize: '12px', fontWeight: '600', border: '1px solid #dcfce7' },
  roleBadge: { padding: '4px 12px', borderRadius: '20px', color: '#fff', fontSize: '11px', fontWeight: '700' },
  tableAvatar: { width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #e2e8f0, #cbd5e1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '13px', color: '#475569', flexShrink: 0 },
  editBtn: { border: '1px solid #e2e8f0', background: '#fff', padding: '7px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', color: '#475569', transition: 'all 0.15s' },
  
  // Filters
  filterRow: { display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' },
  filterGroup: { display: 'flex', alignItems: 'center', gap: '8px' },
  filterLabel: { fontSize: '13px', fontWeight: '600', color: '#64748b' },
  filterSelect: { padding: '9px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none', cursor: 'pointer', background: '#fff', fontSize: '13px', fontWeight: '500', color: '#334155' },
  filterDate: { padding: '9px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '500', color: '#334155' },

  // Counter Management
  addRow: { display: 'flex', gap: '12px', padding: '24px', borderBottom: '1px solid #f1f5f9' },
  addInput: { flex: 1, padding: '12px 16px', borderRadius: '10px', border: '2px solid #e2e8f0', fontSize: '14px', outline: 'none', fontFamily: 'Inter, sans-serif', transition: 'border-color 0.15s' },
  addBtn: { background: 'linear-gradient(135deg, #1FBBA6, #14917e)', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '14px', whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(31,187,166,0.25)' },
  counterGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px', padding: '24px' },
  counterCard: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderRadius: '12px', border: '1px solid #f1f5f9', background: '#fafbfc', transition: 'all 0.15s' },
  counterCardLeft: { display: 'flex', alignItems: 'center', gap: '14px' },
  counterCardIcon: { width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' },
  counterCardName: { margin: 0, fontWeight: '700', fontSize: '14px', color: '#1e293b' },
  counterCardSub: { margin: '2px 0 0', fontSize: '12px', color: '#94a3b8' },
  deleteBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', padding: '8px', borderRadius: '8px', transition: 'all 0.15s', opacity: 0.5 },

  // Modal
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: '20px', width: '420px', maxWidth: '90vw', boxShadow: '0 25px 50px rgba(0,0,0,0.15)', overflow: 'hidden' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #f1f5f9' },
  modalTitle: { margin: 0, fontSize: '18px', fontWeight: '700' },
  modalClose: { background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#94a3b8', padding: '4px' },
  modalUserInfo: { textAlign: 'center', padding: '24px 24px 16px' },
  modalAvatar: { width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #1FBBA6, #14917e)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '800', fontSize: '22px', margin: '0 auto 12px' },
  modalUserName: { margin: 0, fontWeight: '700', fontSize: '16px', color: '#1e293b' },
  modalUserEmail: { margin: '3px 0 0', fontSize: '13px', color: '#94a3b8' },
  modalBody: { padding: '0 24px 20px' },
  modalField: { marginBottom: '16px' },
  modalLabel: { display: 'block', fontSize: '12px', fontWeight: '700', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  modalSelect: { width: '100%', padding: '12px', borderRadius: '10px', border: '2px solid #e2e8f0', fontSize: '14px', outline: 'none', fontFamily: 'Inter, sans-serif' },
  counterPills: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  pill: { padding: '10px 18px', border: '2px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', transition: 'all 0.15s' },
  modalActions: { padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: '10px' },
  modalSaveBtn: { width: '100%', padding: '13px', background: 'linear-gradient(135deg, #1FBBA6, #14917e)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '14px', boxShadow: '0 2px 8px rgba(31,187,166,0.25)' },
  modalCancelBtn: { width: '100%', padding: '10px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '13px', fontWeight: '500' },
};

export default AdminDashboard;