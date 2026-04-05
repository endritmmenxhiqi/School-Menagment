import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

interface CurrentStudent {
  id: string;
  studentName: string;
  ticketNumber: string;
  timestamp: string;
}

interface HistoryItem {
  student_name: string;
  ticket_number: string;
  completed_at: string;
  counter_name: string;
  status?: string;
}

const StaffDashboard = () => {
  const [activeTab, setActiveTab] = useState<'live' | 'history'>('live');
  const [currentStudent, setCurrentStudent] = useState<CurrentStudent | null>(null);
  const [waitingList, setWaitingList] = useState<CurrentStudent[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const navigate = useNavigate();
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const [user, setUser] = useState(storedUser);
  const [myCounter, setMyCounter] = useState<string | null>(null);

  const fetchStaffProfile = async () => {
    if (!storedUser || !storedUser.id) {
      navigate('/login');
      return;
    }
    try {
      const res = await axios.get(`http://localhost:5000/api/users/${storedUser.id}`);
      const freshData = res.data;
      if (!freshData.department) {
        toast.error("Nuk keni sportel të caktuar! Kontaktoni administratorin.", { duration: 5000 });
        navigate('/login');
        return;
      }
      setMyCounter(freshData.department);
      setUser(freshData);
      localStorage.setItem('user', JSON.stringify(freshData));
      fetchWaitingList(freshData.department);
    } catch (err: any) {
      console.error("Gabim në marrjen e profilit:", err.response?.data || err.message);
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

  useEffect(() => { fetchStaffProfile(); }, []);

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
        toast.success('Nxënësi u thirr me sukses!');
      } else {
        toast.error("Nuk ka asnjë nxënës në pritje!");
      }
    } catch (err) {
      toast.error("Gabim gjatë thirrjes.");
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
      toast.success(status === 'completed' ? 'Shërbimi u krye!' : 'U shënua si mosprezent.');
    } catch (err) {
      toast.error("Gabim gjatë përfundimit.");
    }
  };

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

  if (loading) return (
    <div style={s.loaderPage}>
      <div style={s.loaderContent}>
        <div style={s.loaderIcon}>⚡</div>
        <p style={s.loaderText}>Duke u lidhur me sportelin...</p>
      </div>
    </div>
  );

  return (
    <div style={s.app}>
      {/* SIDEBAR */}
      <aside style={s.sidebar}>
        <div style={s.logoArea}>
          <div style={s.logoMark}>⚡</div>
          <div>
            <h2 style={s.logoTitle}>QueueFlow</h2>
            <p style={s.logoSub}>Staff Panel</p>
          </div>
        </div>

        <nav style={s.nav}>
          <div 
            style={activeTab === 'live' ? s.navActive : s.navBtn} 
            onClick={() => setActiveTab('live')}
          >
            <span style={s.navIcon}>📊</span>
            <span>Monitorimi Live</span>
            {waitingList.length > 0 && <span style={s.navBadge}>{waitingList.length}</span>}
          </div>
          <div 
            style={activeTab === 'history' ? s.navActive : s.navBtn} 
            onClick={() => setActiveTab('history')}
          >
            <span style={s.navIcon}>📜</span>
            <span>Historia ime</span>
          </div>
        </nav>

        <div style={s.sidebarFooter}>
          <div style={s.counterLabel}>
            <span style={{fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px'}}>Sporteli im</span>
            <div style={s.counterDisplay}>
              <span style={s.counterDot} />
              {myCounter || '—'}
            </div>
          </div>

          <div style={s.userInfo}>
            <div style={s.userAvatar}>
              {(user.full_name || 'S').charAt(0).toUpperCase()}
            </div>
            <div style={{flex: 1, minWidth: 0}}>
              <p style={s.userName}>{user.full_name || 'Staf'}</p>
              <p style={s.userRole}>Staf Admin</p>
            </div>
          </div>

          <button onClick={() => { localStorage.clear(); navigate('/login'); }} style={s.logoutBtn}>
            🚪 Dil nga Sistemi
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={s.main}>
        <div style={s.pageHeader}>
          <div>
            <h1 style={s.pageTitle}>
              Sporteli: <span style={{color: '#1FBBA6'}}>{myCounter}</span>
            </h1>
            <p style={s.pageDesc}>Stafi: {user.full_name}</p>
          </div>
          <div style={s.headerStats}>
            <div style={s.miniStat}>
              <span style={s.miniStatValue}>{waitingList.length}</span>
              <span style={s.miniStatLabel}>Në pritje</span>
            </div>
            <div style={s.miniStat}>
              <span style={{...s.miniStatValue, color: currentStudent ? '#10b981' : '#cbd5e1'}}>{currentStudent ? '1' : '0'}</span>
              <span style={s.miniStatLabel}>Duke shërbyer</span>
            </div>
          </div>
        </div>

        {activeTab === 'live' ? (
          <div style={s.liveGrid}>
            {/* WAITING LIST */}
            <div style={s.waitCard}>
              <div style={s.waitCardHeader}>
                <h3 style={s.waitCardTitle}>Radha e Nxënësve</h3>
                <span style={s.waitCount}>{waitingList.length}</span>
              </div>
              <div style={s.waitListScroll}>
                {waitingList.length > 0 ? waitingList.map((student, i) => (
                  <div key={i} style={s.waitItem}>
                    <div style={s.waitItemLeft}>
                      <div style={s.waitNum}>{i + 1}</div>
                      <div>
                        <p style={s.waitTicket}>#{student.ticketNumber}</p>
                        <p style={s.waitName}>{student.studentName}</p>
                      </div>
                    </div>
                    <span style={s.waitTime}>
                      {new Date(student.timestamp).toLocaleTimeString('sq-AL', {hour: '2-digit', minute: '2-digit'})}
                    </span>
                  </div>
                )) : (
                  <div style={s.emptyWait}>
                    <span style={{fontSize: '40px', marginBottom: '12px'}}>🎉</span>
                    <p style={{color: '#94a3b8', fontSize: '14px', margin: 0}}>Nuk ka nxënës në radhë!</p>
                    <p style={{color: '#cbd5e1', fontSize: '12px', margin: '4px 0 0'}}>Rehatohuni për momentin.</p>
                  </div>
                )}
              </div>
            </div>

            {/* ACTION AREA */}
            <div style={s.actionCard}>
              {currentStudent ? (
                <div style={s.activeArea}>
                  <div style={s.activeHeader}>
                    <span style={s.activePulse} />
                    <span style={{fontSize: '13px', fontWeight: '700', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Duke shërbyer tani</span>
                  </div>

                  <div style={s.activeTicketArea}>
                    <div style={s.activeTicketBadge}>#{currentStudent.ticketNumber}</div>
                    <h2 style={s.activeStudentName}>{currentStudent.studentName}</h2>
                  </div>

                  <div style={s.actionButtons}>
                    <button onClick={() => handleFinish('completed')} style={s.completeBtn}>
                      <span style={{fontSize: '20px'}}>✅</span>
                      <span>Kryer</span>
                    </button>
                    <button onClick={() => handleFinish('no-show')} style={s.noShowBtn}>
                      <span style={{fontSize: '20px'}}>❌</span>
                      <span>Nuk erdhi</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div style={s.idleArea}>
                  <div style={s.idleIcon}>📢</div>
                  <h3 style={s.idleTitle}>Gati për të thirrur?</h3>
                  <p style={s.idleDesc}>Kliko butonin për të thirrur nxënësin e radhës</p>
                  <button 
                    onClick={handleCallNext} 
                    disabled={waitingList.length === 0} 
                    style={{
                      ...s.callBtn,
                      opacity: waitingList.length === 0 ? 0.4 : 1,
                      cursor: waitingList.length === 0 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Thirr të Radhës
                    <span style={{marginLeft: '8px'}}>📢</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* HISTORY TAB */
          <div style={s.historySection}>
            <div style={s.historyHeader}>
              <h3 style={s.historyTitle}>Arkiva e Punës</h3>
              <input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)} 
                style={s.dateInput}
              />
            </div>
            <div style={s.contentCard}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>#</th>
                    <th style={s.th}>Bileta</th>
                    <th style={s.th}>Nxënësi</th>
                    <th style={s.th}>Koha</th>
                    <th style={s.th}>Statusi</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length > 0 ? history.map((h, i) => (
                    <tr key={i} style={s.tr}>
                      <td style={s.td}><span style={s.rowNum}>{i + 1}</span></td>
                      <td style={{...s.td, fontWeight: '700', color: '#1FBBA6'}}>#{h.ticket_number || '—'}</td>
                      <td style={s.td}>{h.student_name || '—'}</td>
                      <td style={{...s.td, color: '#94a3b8'}}>
                        {h.completed_at ? new Date(h.completed_at).toLocaleTimeString('sq-AL', {hour: '2-digit', minute: '2-digit'}) : '—'}
                      </td>
                      <td style={s.td}>
                        <span style={getStatusBadge(h.status)}>
                          {getStatusText(h.status)}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} style={s.emptyRow}>
                        Nuk ka shënime për këtë datë.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const s: { [key: string]: React.CSSProperties } = {
  app: { display: 'flex', height: '100vh', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", background: '#f8fafc' },
  
  // Loader
  loaderPage: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f172a, #1e293b)', fontFamily: "'Inter', sans-serif" },
  loaderContent: { textAlign: 'center' },
  loaderIcon: { fontSize: '48px', marginBottom: '16px', display: 'block' },
  loaderText: { color: '#94a3b8', fontSize: '16px', fontWeight: '500' },

  // Sidebar
  sidebar: { width: '280px', background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)', display: 'flex', flexDirection: 'column', flexShrink: 0, padding: '0' },
  logoArea: { display: 'flex', alignItems: 'center', gap: '14px', padding: '28px 24px 35px', borderBottom: '1px solid rgba(255,255,255,0.06)' },
  logoMark: { background: 'linear-gradient(135deg, #1FBBA6, #14917e)', padding: '10px 14px', borderRadius: '14px', fontSize: '22px' },
  logoTitle: { color: '#f8fafc', margin: 0, fontSize: '20px', fontWeight: '800', letterSpacing: '-0.3px' },
  logoSub: { color: '#64748b', margin: 0, fontSize: '12px', fontWeight: '500' },

  nav: { flex: 1, padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '4px' },
  navBtn: { display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 16px', color: '#94a3b8', borderRadius: '12px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', transition: 'all 0.15s', position: 'relative' },
  navActive: { display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 16px', background: 'linear-gradient(135deg, rgba(31,187,166,0.15), rgba(31,187,166,0.05))', color: '#1FBBA6', borderRadius: '12px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', border: '1px solid rgba(31,187,166,0.2)', position: 'relative' },
  navIcon: { fontSize: '18px', width: '24px', textAlign: 'center' },
  navBadge: { marginLeft: 'auto', background: '#ef4444', color: '#fff', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '10px' },

  sidebarFooter: { padding: '20px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '16px' },
  counterLabel: { display: 'flex', flexDirection: 'column', gap: '6px', padding: '0 4px' },
  counterDisplay: { display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontWeight: '700', fontSize: '16px' },
  counterDot: { width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px rgba(16, 185, 129, 0.5)', flexShrink: 0 },
  userInfo: { display: 'flex', alignItems: 'center', gap: '12px', padding: '0 4px' },
  userAvatar: { width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #1FBBA6, #14917e)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '700', fontSize: '14px', flexShrink: 0 },
  userName: { margin: 0, color: '#e2e8f0', fontWeight: '600', fontSize: '13px' },
  userRole: { margin: 0, color: '#64748b', fontSize: '11px' },
  logoutBtn: { width: '100%', textAlign: 'center', color: '#f87171', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', padding: '10px', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', fontFamily: 'Inter, sans-serif' },

  // Main
  main: { flex: 1, padding: '32px 40px', overflowY: 'auto' },
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' },
  pageTitle: { fontSize: '28px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px', letterSpacing: '-0.5px' },
  pageDesc: { color: '#64748b', margin: 0, fontSize: '14px' },
  headerStats: { display: 'flex', gap: '16px' },
  miniStat: { display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#fff', padding: '12px 20px', borderRadius: '14px', border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
  miniStatValue: { fontSize: '24px', fontWeight: '800', color: '#1FBBA6', lineHeight: '1' },
  miniStatLabel: { fontSize: '11px', color: '#94a3b8', fontWeight: '600', marginTop: '2px' },

  // Live Grid
  liveGrid: { display: 'grid', gridTemplateColumns: '340px 1fr', gap: '24px', height: 'calc(100vh - 180px)' },
  
  // Wait Card
  waitCard: { background: '#fff', borderRadius: '16px', display: 'flex', flexDirection: 'column', border: '1px solid #f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' },
  waitCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px', borderBottom: '1px solid #f1f5f9' },
  waitCardTitle: { margin: 0, fontSize: '14px', fontWeight: '700', color: '#475569' },
  waitCount: { background: 'linear-gradient(135deg, #1FBBA6, #14917e)', color: '#fff', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '800' },
  waitListScroll: { flex: 1, overflowY: 'auto', padding: '8px 12px' },
  waitItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderRadius: '10px', marginBottom: '4px', transition: 'background 0.1s' },
  waitItemLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  waitNum: { width: '28px', height: '28px', borderRadius: '8px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: '#64748b', flexShrink: 0 },
  waitTicket: { margin: 0, fontWeight: '700', color: '#1FBBA6', fontSize: '14px' },
  waitName: { margin: '1px 0 0', color: '#64748b', fontSize: '13px' },
  waitTime: { color: '#cbd5e1', fontSize: '12px', fontWeight: '500' },
  emptyWait: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '50px 20px', textAlign: 'center' },

  // Action Card
  actionCard: { background: '#fff', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', padding: '40px' },

  // Active state
  activeArea: { width: '100%', maxWidth: '400px', textAlign: 'center' },
  activeHeader: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '28px' },
  activePulse: { width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 12px rgba(16, 185, 129, 0.5)', animation: 'pulse 2s infinite' },
  activeTicketArea: { marginBottom: '35px' },
  activeTicketBadge: { display: 'inline-block', color: '#10b981', padding: '18px 35px', borderRadius: '18px', fontSize: '48px', fontWeight: '900', border: '3px dashed #10b981', background: 'rgba(16, 185, 129, 0.05)', letterSpacing: '-1px' },
  activeStudentName: { fontSize: '26px', fontWeight: '800', color: '#1e293b', margin: '18px 0 0' },
  actionButtons: { display: 'flex', gap: '16px', justifyContent: 'center' },
  completeBtn: { display: 'flex', alignItems: 'center', gap: '10px', background: 'linear-gradient(135deg, #0f172a, #1e293b)', color: '#fff', padding: '14px 32px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '15px', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)', fontFamily: 'Inter, sans-serif' },
  noShowBtn: { display: 'flex', alignItems: 'center', gap: '10px', background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff', padding: '14px 32px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '15px', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)', fontFamily: 'Inter, sans-serif' },

  // Idle state
  idleArea: { textAlign: 'center', maxWidth: '360px' },
  idleIcon: { fontSize: '56px', marginBottom: '20px' },
  idleTitle: { fontSize: '22px', fontWeight: '800', color: '#1e293b', margin: '0 0 8px' },
  idleDesc: { color: '#94a3b8', fontSize: '14px', margin: '0 0 28px' },
  callBtn: { background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', padding: '16px 40px', borderRadius: '14px', border: 'none', fontWeight: '800', fontSize: '17px', boxShadow: '0 6px 20px rgba(16, 185, 129, 0.3)', transition: 'all 0.2s', fontFamily: 'Inter, sans-serif' },

  // History
  historySection: { animation: 'fadeIn 0.3s ease-out' },
  historyHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  historyTitle: { margin: 0, fontSize: '18px', fontWeight: '700', color: '#1e293b' },
  dateInput: { padding: '9px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '500', color: '#334155', fontFamily: 'Inter, sans-serif' },

  // Table
  contentCard: { background: '#fff', borderRadius: '16px', overflow: 'hidden', border: '1px solid #f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '14px 20px', borderBottom: '2px solid #f1f5f9', color: '#94a3b8', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', background: '#fafbfc' },
  td: { padding: '14px 20px', borderBottom: '1px solid #f8fafc', fontSize: '14px', color: '#334155' },
  tr: { transition: 'background 0.1s' },
  rowNum: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '8px', background: '#f1f5f9', fontSize: '12px', fontWeight: '700', color: '#64748b' },
  emptyRow: { textAlign: 'center', padding: '40px 20px', color: '#94a3b8', fontSize: '14px' },
};

export default StaffDashboard;