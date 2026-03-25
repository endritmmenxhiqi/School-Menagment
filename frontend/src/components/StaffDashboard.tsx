import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface CurrentStudent {
  id: string;
  studentName: string;
  ticketNumber: string;
  timestamp: string;
}

interface HistoryItem {
  studentName: string;
  ticketNumber: string;
  timestamp: string;
  status: string; // 'completed' ose 'no-show'
}

const StaffDashboard = () => {
  const [activeTab, setActiveTab] = useState<'live' | 'history'>('live');
  const [currentStudent, setCurrentStudent] = useState<CurrentStudent | null>(null);
  const [waitingList, setWaitingList] = useState<CurrentStudent[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const navigate = useNavigate();

  // Marrim të dhënat fillestare nga localStorage
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const [user, setUser] = useState(storedUser);
  const [myCounter, setMyCounter] = useState<string | null>(null);

  // 1. Funksioni që merr sportelin e saktë nga Backend (Zgjidhja e gabimit 400)
  const fetchStaffProfile = async () => {
    // Nëse nuk ka ID në localStorage, kthehu te login menjëherë
    if (!storedUser || !storedUser.id) {
      console.error("ID e përdoruesit nuk u gjet!");
      navigate('/login');
      return;
    }

    try {
      const res = await axios.get(`http://localhost:5000/api/users/${storedUser.id}`);
      const freshData = res.data;

      if (!freshData.department) {
        alert("Nuk keni sportel të caktuar! Kontaktoni administratorin.");
        navigate('/login');
        return;
      }

      setMyCounter(freshData.department);
      setUser(freshData);
      
      // Sinkronizojmë localStorage me të dhënat e fundit nga DB
      localStorage.setItem('user', JSON.stringify(freshData));
      
      // Sapo marrim emrin e sportelit, mbushim listën e pritjes
      fetchWaitingList(freshData.department);
    } catch (err: any) {
      console.error("Gabim në marrjen e profilit:", err.response?.data || err.message);
      // Nëse ID është e gabuar (400) ose nuk ekziston (404), logout
      if (err.response?.status === 400 || err.response?.status === 404) {
        localStorage.clear();
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchWaitingList = async (counterName: string) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/queue/${encodeURIComponent(counterName)}`);
      setWaitingList(res.data);
    } catch (err) {
      console.error("Gabim gjatë marrjes së radhës");
    }
  };

  const fetchMyHistory = async (date: string) => {
    if (!myCounter) return;
    try {
      const res = await axios.get(`http://localhost:5000/api/history?date=${date}`);
      const myWork = res.data.filter((h: any) => h.counter_name === myCounter);
      setHistory(myWork);
    } catch (err) {
      console.error("Gabim në histori");
      setHistory([]);
    }
  };

  // Ngarkimi fillestar
  useEffect(() => {
    fetchStaffProfile();
  }, []);

  // Përditësimet automatike (Polling çdo 5 sekonda)
  useEffect(() => {
    if (myCounter) {
      if (activeTab === 'live') {
        const interval = setInterval(() => fetchWaitingList(myCounter), 5000);
        return () => clearInterval(interval);
      } else {
        fetchMyHistory(selectedDate);
      }
    }
  }, [myCounter, activeTab, selectedDate]);

  const handleCallNext = async () => {
    if (!myCounter) return;
    try {
      const res = await axios.post('http://localhost:5000/api/call-next', { counterName: myCounter });
      if (res.data.student) {
        setCurrentStudent(res.data.student);
        fetchWaitingList(myCounter);
      } else {
        alert("Nuk ka asnjë nxënës në pritje!");
      }
    } catch (err) {
      alert("Gabim gjatë thirrjes.");
    }
  };

  const handleFinish = async (status: 'completed' | 'no-show') => {
    if (!currentStudent || !myCounter) return;
    try {
      await axios.post('http://localhost:5000/api/finish-student', {
        studentName: currentStudent.studentName,
        ticketNumber: currentStudent.ticketNumber,
        counterName: myCounter,
        status: status
      });
      setCurrentStudent(null);
      fetchWaitingList(myCounter);
    } catch (err) {
      alert("Gabim gjatë përfundimit.");
    }
  };

  if (loading) return <div style={styles.loader}>Duke u lidhur me sportelin...</div>;

  return (
    <div style={styles.container}>
      <aside style={styles.sidebar}>
        <div style={styles.logoSection}>
          <div style={styles.logoIcon}>⚡</div>
          <h2 style={styles.logoText}>QueueFlow</h2>
        </div>

        <nav style={styles.navMenu}>
          <div 
            style={activeTab === 'live' ? styles.navItemActive : styles.navItem} 
            onClick={() => setActiveTab('live')}
          >
            <span style={styles.icon}>📊</span> Monitorimi Live
          </div>
          <div 
            style={activeTab === 'history' ? styles.navItemActive : styles.navItem} 
            onClick={() => setActiveTab('history')}
          >
            <span style={styles.icon}>📜</span> Historia ime
          </div>
        </nav>

        <div style={styles.bottomSection}>
          <div style={styles.divider}></div>
          <button onClick={() => { localStorage.clear(); navigate('/login'); }} style={styles.logoutBtn}>
            🚪 Dil nga Sistemi
          </button>
        </div>
      </aside>

      <main style={styles.main}>
        <header style={styles.header}>
          <h1 style={styles.welcomeTitle}>Sporteli: <span style={{color: '#1fbba6'}}>{myCounter}</span></h1>
          <p style={styles.subTitle}>Stafi: {user.full_name}</p>
        </header>

        {activeTab === 'live' ? (
          <div style={styles.grid}>
            <div style={styles.card}>
              <p style={styles.cardLabel}>RADHA E NXËNËSVE ({waitingList.length})</p>
              <div style={styles.waitingListScroll}>
                {waitingList.length > 0 ? waitingList.map((s, i) => (
                  <div key={i} style={styles.waitingItem}>
                    <span style={styles.waitingTicket}>#{s.ticketNumber}</span>
                    <span style={styles.waitingName}>{s.studentName}</span>
                  </div>
                )) : <p style={{color: '#94a3b8', fontSize: '14px', marginTop: '10px'}}>Nuk ka nxënës në radhë.</p>}
              </div>
            </div>

            <div style={styles.actionCard}>
              {currentStudent ? (
                <div style={styles.activeStudent}>
                  <div style={styles.ticketBadge}>#{currentStudent.ticketNumber}</div>
                  <h2 style={styles.studentName}>{currentStudent.studentName}</h2>
                  <div style={{display: 'flex', gap: '15px', justifyContent: 'center'}}>
                    <button onClick={() => handleFinish('completed')} style={styles.finishBtn}>Kryer ✅</button>
                    <button onClick={() => handleFinish('no-show')} style={styles.noShowBtn}>Nuk erdhi ❌</button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={handleCallNext} 
                  disabled={waitingList.length === 0} 
                  style={{...styles.callBtn, opacity: waitingList.length === 0 ? 0.5 : 1}}
                >
                  Thirr të Radhës 📢
                </button>
              )}
            </div>
          </div>
        ) : (
          <div style={styles.cardFull}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
              <h3 style={{margin: 0}}>Arkiva e Punës</h3>
              <input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)} 
                style={styles.dateInput}
              />
            </div>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Bileta</th>
                  <th style={styles.th}>Nxënësi</th>
                  <th style={styles.th}>Koha</th>
                  <th style={styles.th}>Statusi</th>
                </tr>
              </thead>
              <tbody>
                {history.length > 0 ? history.map((h, i) => (
                  <tr key={i}>
                    <td style={styles.td}>#{h.ticketNumber}</td>
                    <td style={styles.td}>{h.studentName}</td>
                    <td style={styles.td}>{new Date(h.timestamp).toLocaleTimeString()}</td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.badge, 
                        backgroundColor: h.status === 'no-show' ? '#ef4444' : '#10b981'
                      }}>
                        {h.status === 'no-show' ? 'Nuk erdhi' : 'I Kryer'}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} style={{textAlign: 'center', padding: '30px', color: '#94a3b8'}}>
                      Nuk ka shënime për këtë datë.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: { display: 'flex', height: '100vh', backgroundColor: '#f8fafc', fontFamily: 'Inter, sans-serif' },
  sidebar: { width: '280px', backgroundColor: '#1e293b', display: 'flex', flexDirection: 'column', padding: '30px 20px' },
  logoSection: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '50px' },
  logoIcon: { background: '#1FBBA6', color: '#fff', padding: '8px', borderRadius: '8px', fontSize: '20px', fontWeight: 'bold' },
  logoText: { color: '#fff', margin: 0, fontSize: '24px', fontWeight: 'bold' },
  navMenu: { flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' },
  navItem: { color: '#94a3b8', padding: '12px 15px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' },
  navItemActive: { backgroundColor: '#1FBBA6', color: '#fff', padding: '12px 15px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' },
  icon: { fontSize: '18px' },
  bottomSection: { marginTop: 'auto' },
  divider: { height: '1px', backgroundColor: '#334155', marginBottom: '20px' },
  logoutBtn: { width: '100%', background: 'none', border: 'none', color: '#f87171', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', textAlign: 'left' },
  main: { flex: 1, padding: '40px', overflowY: 'auto' },
  header: { marginBottom: '30px' },
  welcomeTitle: { fontSize: '28px', fontWeight: 'bold', color: '#1e293b' },
  subTitle: { color: '#64748b' },
  grid: { display: 'grid', gridTemplateColumns: '320px 1fr', gap: '25px' },
  card: { backgroundColor: '#fff', padding: '20px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' },
  cardFull: { backgroundColor: '#fff', padding: '30px', borderRadius: '20px' },
  cardLabel: { fontSize: '12px', fontWeight: 'bold', color: '#94a3b8', marginBottom: '15px' },
  waitingListScroll: { maxHeight: '450px', overflowY: 'auto' },
  waitingItem: { display: 'flex', gap: '10px', padding: '12px 0', borderBottom: '1px solid #f1f5f9' },
  waitingTicket: { fontWeight: 'bold', color: '#1fbba6' },
  waitingName: { color: '#334155' },
  actionCard: { backgroundColor: '#fff', borderRadius: '20px', padding: '40px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '320px' },
  ticketBadge: { display: 'inline-block', color: '#10b981', padding: '15px 30px', borderRadius: '15px', fontSize: '45px', fontWeight: 'bold', border: '2px dashed #10b981', marginBottom: '20px' },
  studentName: { fontSize: '28px', fontWeight: 'bold', marginBottom: '30px' },
  callBtn: { backgroundColor: '#10b981', color: '#fff', padding: '15px 40px', borderRadius: '12px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '18px' },
  finishBtn: { backgroundColor: '#1e293b', color: '#fff', padding: '12px 25px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 'bold' },
  noShowBtn: { backgroundColor: '#ef4444', color: '#fff', padding: '12px 25px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 'bold' },
  dateInput: { padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '12px', borderBottom: '2px solid #f1f5f9', color: '#64748b' },
  td: { padding: '12px', borderBottom: '1px solid #f1f5f9' },
  badge: { padding: '4px 10px', borderRadius: '8px', color: '#fff', fontSize: '12px' },
  loader: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#64748b' }
};

export default StaffDashboard;