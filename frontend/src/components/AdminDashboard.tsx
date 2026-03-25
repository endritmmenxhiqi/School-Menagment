import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface User { id: string; full_name: string; email: string; role: string; department: string | null; }
interface Counter { id: string; name: string; }
interface QueueItem { studentName: string; ticketNumber: string; timestamp: string; counter_name?: string; completed_at?: string; }

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'counters' | 'history'>('stats');
  const [users, setUsers] = useState<User[]>([]);
  const [counters, setCounters] = useState<Counter[]>([]);
  const [selectedQueue, setSelectedQueue] = useState<QueueItem[]>([]);
  const [history, setHistory] = useState<QueueItem[]>([]);
  const [viewingCounter, setViewingCounter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterDept, setFilterDept] = useState<string | 'All'>('All');
  const [newCounterName, setNewCounterName] = useState('');
  
  // State i ri për filtrin e sportelit në Histori
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

  useEffect(() => { 
    fetchData(); 
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory(selectedDate);
    }
  }, [activeTab, selectedDate]);

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
    fetchData();
  };

  const handleDeleteCounter = async (id: string, name: string) => {
    if (window.confirm(`A jeni i sigurt që dëshironi të fshini sportelin ${name}?`)) {
      await axios.delete(`http://localhost:5000/api/counters/${id}`);
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
      fetchData();
    } catch (err) {
      alert("Gabim gjatë përditësimit!");
    }
  };

  return (
    <div style={styles.appContainer}>
      {/* SIDEBAR */}
      <div style={styles.sidebar}>
        <div style={styles.logoSection}>
          <span style={styles.logoIcon}>⚡</span>
          <h2 style={styles.logoText}>QueueFlow</h2>
        </div>
        <nav style={styles.nav}>
          <div style={activeTab === 'stats' ? styles.navItemActive : styles.navItem} onClick={() => { setActiveTab('stats'); setViewingCounter(null); }}>📊 Monitorimi Live</div>
          <div style={activeTab === 'history' ? styles.navItemActive : styles.navItem} onClick={() => setActiveTab('history')}>📜 Historia e Punës</div>
          <div style={activeTab === 'users' ? styles.navItemActive : styles.navItem} onClick={() => { setActiveTab('users'); setFilterDept('All'); }}>👥 Menaxhimi i Përdoruesve</div>
          <div style={activeTab === 'counters' ? styles.navItemActive : styles.navItem} onClick={() => setActiveTab('counters')}>🖥️ Menaxhimi i Sporteleve</div>
        </nav>
        <div onClick={() => { localStorage.clear(); navigate('/login'); }} style={styles.logoutSection}>🚪 Dil nga Sistemi</div>
      </div>

      {/* MAIN CONTENT */}
      <div style={styles.mainContent}>
        {loading ? (
          <div style={styles.loader}>Duke u ngarkuar të dhënat...</div>
        ) : (
          <>
            {/* 1. MONITORIMI LIVE */}
            {activeTab === 'stats' && (
              <div>
                <header style={styles.header}>
                  <h1 style={styles.headerTitle}>{viewingCounter ? `Detajet: ${viewingCounter}` : 'Qendra e Monitorimit'}</h1>
                  {viewingCounter && <button onClick={() => setViewingCounter(null)} style={styles.clearFilter}>← Kthehu te Sportelet</button>}
                </header>
                {!viewingCounter ? (
                  <div style={styles.statsGrid}>
                    {counters.map(c => (
                      <div key={c.id} style={styles.monitorCard} onClick={() => fetchQueueDetails(c.name)}>
                        <div style={{display: 'flex', justifyContent: 'space-between'}}>
                          <span style={styles.statLabel}>{c.name}</span>
                          <span style={styles.livePulse}>● LIVE</span>
                        </div>
                        <div style={styles.statValue}>0</div>
                        <div style={{fontSize: '12px', color: '#64748b'}}>Nxënës në pritje (Kliko për emrat)</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={styles.contentCard}>
                    <table style={styles.table}>
                      <thead>
                        <tr><th style={styles.th}>Bileta</th><th style={styles.th}>Emri i Nxënësit</th><th style={styles.th}>Koha</th></tr>
                      </thead>
                      <tbody>
                        {selectedQueue.length > 0 ? selectedQueue.map((q, i) => (
                          <tr key={i}>
                            <td style={{...styles.td, color: '#1fbba6', fontWeight: 'bold'}}>#{q.ticketNumber}</td>
                            <td style={styles.td}>{q.studentName}</td>
                            <td style={styles.td}>{new Date(q.timestamp).toLocaleTimeString()}</td>
                          </tr>
                        )) : <tr><td colSpan={3} style={{textAlign: 'center', padding: '20px'}}>Radha është bosh.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 2. HISTORIA (ME FILTRIN E SPORTELIT) */}
            {activeTab === 'history' && (
              <div>
                <header style={styles.header}>
                  <h1 style={styles.headerTitle}>Arshiva e Radhëve</h1>
                  <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
                    {/* Filtri i Sportelit */}
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                      <span style={{fontSize: '14px', fontWeight: 'bold'}}>Sporteli:</span>
                      <select 
                        style={styles.selectSmall} 
                        value={historyCounterFilter} 
                        onChange={(e) => setHistoryCounterFilter(e.target.value)}
                      >
                        <option value="All">Të Gjithë</option>
                        {counters.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>

                    {/* Filtri i Datës */}
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                      <span style={{fontSize: '14px', fontWeight: 'bold'}}>Data:</span>
                      <input 
                        type="date" 
                        style={styles.dateInput} 
                        value={selectedDate} 
                        onChange={(e) => setSelectedDate(e.target.value)} 
                      />
                    </div>
                  </div>
                </header>

                <div style={styles.contentCard}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Bileta</th>
                        <th style={styles.th}>Emri i Nxënësit</th>
                        <th style={styles.th}>Sporteli</th>
                        <th style={styles.th}>Koha e Kryerjes</th>
                        <th style={styles.th}>Statusi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history
                        .filter(h => historyCounterFilter === 'All' || h.counter_name === historyCounterFilter)
                        .length > 0 ? history
                          .filter(h => historyCounterFilter === 'All' || h.counter_name === historyCounterFilter)
                          .map((h, i) => (
                            <tr key={i}>
                              <td style={{...styles.td, fontWeight: 'bold'}}>#{h.ticketNumber}</td>
                              <td style={styles.td}>{h.studentName}</td>
                              <td style={styles.td}>{h.counter_name}</td>
                              <td style={styles.td}>{new Date(h.completed_at || h.timestamp).toLocaleTimeString()}</td>
                              <td style={styles.td}><span style={{...styles.badge, backgroundColor: '#22c55e'}}>I Kryer ✅</span></td>
                            </tr>
                          )) : <tr><td colSpan={5} style={{textAlign: 'center', padding: '30px', color: '#64748b'}}>Nuk ka rekorde për këto filtra.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. MENAXHIMI I PERDORUESVE */}
            {activeTab === 'users' && (
              <div>
                <header style={styles.header}>
                  <h1 style={styles.headerTitle}>{filterDept === 'All' ? 'Përdoruesit' : `Stafi: ${filterDept}`}</h1>
                  {filterDept !== 'All' && <button onClick={() => setFilterDept('All')} style={styles.clearFilter}>Hiq filtrin x</button>}
                </header>
                <div style={styles.contentCard}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Emri</th><th style={styles.th}>Email</th><th style={styles.th}>Roli</th><th style={styles.th}>Sporteli</th><th style={styles.th}>Veprimi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.filter(u => filterDept === 'All' || u.department === filterDept).map(u => (
                        <tr key={u.id}>
                          <td style={styles.td}>{u.full_name}</td>
                          <td style={styles.td}>{u.email}</td>
                          <td style={styles.td}>
                            <span style={{...styles.badge, backgroundColor: u.role === 'admin' ? '#ef4444' : (u.role === 'staf-admin' ? '#1fbba6' : '#64748b')}}>
                              {u.role}
                            </span>
                          </td>
                          <td style={styles.td}>{u.department || '—'}</td>
                          <td style={styles.td}>
                            <button style={styles.editBtn} onClick={() => openEditModal(u)}>⚙️ Ndrysho</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 4. MENAXHIMI I SPORTELEVE */}
            {activeTab === 'counters' && (
              <div>
                <header style={styles.header}><h1 style={styles.headerTitle}>Sportelet</h1></header>
                <div style={styles.contentCard}>
                  <div style={styles.addSection}>
                    <input style={styles.input} value={newCounterName} onChange={e => setNewCounterName(e.target.value)} placeholder="Emri i sportelit..." />
                    <button style={styles.addBtn} onClick={handleAddCounter}>Shto +</button>
                  </div>
                  <div style={styles.counterGrid}>
                    {counters.map(c => (
                      <div key={c.id} style={styles.smallCard}>
                        <span onClick={() => { setFilterDept(c.name); setActiveTab('users'); }} style={{cursor: 'pointer', fontWeight: 'bold'}}>📂 {c.name}</span>
                        <button style={styles.deleteBtn} onClick={() => handleDeleteCounter(c.id, c.name)}>Fshij</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* MODAL EDIT PËRDORUESI */}
      {isModalOpen && selectedUser && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <h3 style={{marginBottom: '5px'}}>Menaxho Përdoruesin</h3>
            <p style={{fontSize: '14px', color: '#64748b', marginBottom: '20px'}}>{selectedUser.full_name}</p>
            
            <div style={{textAlign: 'left', marginBottom: '15px'}}>
              <label style={styles.label}>Zgjidh Rolin:</label>
              <select style={styles.select} value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
                <option value="nxenes">Nxënës</option>
                <option value="staf-admin">Staf Admin</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {selectedRole === 'staf-admin' && (
              <div style={{textAlign: 'left', marginTop: '10px'}}>
                <label style={styles.label}>Cakto Sportelin:</label>
                <div style={styles.counterSelectionGrid}>
                  {counters.map(c => (
                    <button key={c.id} onClick={() => setSelectedDept(c.name)} style={{
                        ...styles.counterMiniBtn,
                        backgroundColor: selectedDept === c.name ? '#1fbba6' : '#f8fafc',
                        color: selectedDept === c.name ? '#fff' : '#1e293b',
                    }}>{c.name}</button>
                  ))}
                </div>
              </div>
            )}

            <button style={{...styles.addBtn, width: '100%', marginTop: '25px'}} onClick={saveUserChanges}>Ruaj</button>
            <button onClick={() => setIsModalOpen(false)} style={styles.cancelBtn}>Anulo</button>
          </div>
        </div>
      )}
    </div>
  );
};

// --- STYLES (SHTUAR selectSmall) ---
const styles: { [key: string]: React.CSSProperties } = {
  appContainer: { display: 'flex', height: '100vh', backgroundColor: '#f1f5f9', fontFamily: 'Inter, sans-serif' },
  sidebar: { width: '280px', backgroundColor: '#1e293b', color: '#fff', padding: '30px', display: 'flex', flexDirection: 'column' },
  logoSection: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '40px' },
  logoIcon: { backgroundColor: '#1fbba6', padding: '5px 12px', borderRadius: '10px', fontSize: '22px' },
  logoText: { fontSize: '22px', fontWeight: 'bold' },
  nav: { flex: 1 },
  navItem: { padding: '15px', color: '#94a3b8', cursor: 'pointer', borderRadius: '12px', marginBottom: '10px' },
  navItemActive: { padding: '15px', backgroundColor: '#1fbba6', color: '#fff', fontWeight: 'bold', borderRadius: '12px' },
  mainContent: { flex: 1, padding: '40px', overflowY: 'auto' },
  loader: { textAlign: 'center', marginTop: '100px', color: '#64748b' },
  header: { marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: '28px', color: '#0f172a', fontWeight: '800' },
  dateInput: { padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', cursor: 'pointer' },
  selectSmall: { padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', cursor: 'pointer', backgroundColor: '#fff' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' },
  monitorCard: { backgroundColor: '#fff', padding: '25px', borderRadius: '20px', cursor: 'pointer' },
  statLabel: { fontSize: '18px', fontWeight: 'bold' },
  statValue: { fontSize: '48px', fontWeight: '900', color: '#1fbba6' },
  livePulse: { color: '#ef4444', fontSize: '11px', fontWeight: 'bold' },
  contentCard: { backgroundColor: '#fff', padding: '25px', borderRadius: '20px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '12px', borderBottom: '2px solid #f1f5f9', color: '#64748b', fontSize: '12px' },
  td: { padding: '12px', borderBottom: '1px solid #f1f5f9', fontSize: '14px' },
  badge: { padding: '4px 12px', borderRadius: '12px', color: '#fff', fontSize: '11px', fontWeight: 'bold' },
  editBtn: { border: 'none', background: '#f1f5f9', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer' },
  addSection: { display: 'flex', gap: '10px', marginBottom: '25px' },
  input: { flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' },
  addBtn: { backgroundColor: '#1fbba6', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' },
  counterGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' },
  smallCard: { padding: '18px', border: '1px solid #e2e8f0', borderRadius: '15px', display: 'flex', justifyContent: 'space-between' },
  deleteBtn: { color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' },
  modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' },
  modalBox: { backgroundColor: '#fff', padding: '35px', borderRadius: '25px', width: '380px', textAlign: 'center' },
  label: { fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '8px' },
  select: { width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' },
  counterSelectionGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px' },
  counterMiniBtn: { padding: '10px', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer', fontSize: '12px' },
  cancelBtn: { background: 'none', border: 'none', color: '#94a3b8', marginTop: '15px', cursor: 'pointer', textDecoration: 'underline' },
  logoutSection: { marginTop: 'auto', textAlign: 'center', color: '#f87171', cursor: 'pointer', fontWeight: 'bold', borderTop: '1px solid #334155', paddingTop: '20px' },
  clearFilter: { border: 'none', background: '#fff', padding: '8px 15px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }
};

export default AdminDashboard;