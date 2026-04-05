import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

interface Counter {
  id: number;
  name: string;
}

interface TicketData {
  id: string;
  studentName: string;
  ticketNumber: string;
  timestamp: string;
  counterName: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [user] = useState(JSON.parse(localStorage.getItem('user') || '{}'));
  const [counters, setCounters] = useState<Counter[]>([]);
  const [selectedCounter, setSelectedCounter] = useState<string>('');
  
  const [myTicket, setMyTicket] = useState<TicketData | null>(null);
  const [peopleAhead, setPeopleAhead] = useState<number | null>(null);
  const [isCalled, setIsCalled] = useState(false);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'ticket' | 'info'>('ticket');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    
    const storedTicket = localStorage.getItem('active_ticket');
    if (storedTicket) {
      setMyTicket(JSON.parse(storedTicket));
    }

    if (!user.full_name && user.id) {
      fetchUserProfile();
    }

    fetchCounters();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchUserProfile = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/users/${user.id}`);
      if (res.data.full_name) {
        const updatedUser = { ...user, full_name: res.data.full_name };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        window.location.reload();
      }
    } catch (err) {
      console.error('Gabim në marrjen e profilit');
    }
  };

  const fetchCounters = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/counters');
      setCounters(res.data);
      if (res.data.length > 0) setSelectedCounter(res.data[0].name);
    } catch (err) {
      console.error("Gabim në marrjen e sporteleve", err);
    } finally {
      setLoading(false);
    }
  };

  const removeNotification = (index: number) => {
    setNotifications(prev => prev.filter((_, i) => i !== index));
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const handleGetTicket = async () => {
    if (!selectedCounter) return;
    try {
      const studentName = user.full_name || 'Nxënës';
      const res = await axios.post('http://localhost:5000/api/generate-ticket', {
        studentName,
        counterName: selectedCounter
      });
      const newTicket = { ...res.data, counterName: selectedCounter };
      
      Object.keys(localStorage).forEach(k => { if(k.startsWith('notified_')) localStorage.removeItem(k); });
      
      setMyTicket(newTicket);
      setIsCalled(false);
      localStorage.setItem('active_ticket', JSON.stringify(newTicket));
      toast.success("Bileta u gjenerua me sukses! 🎫");
    } catch (err) {
      toast.error('Gabim gjatë marrjes së biletës!');
    }
  };

  const handleClearTicket = async () => {
    if (myTicket) {
      try {
        await axios.post('http://localhost:5000/api/cancel-ticket', {
          ticketNumber: myTicket.ticketNumber,
          counterName: myTicket.counterName,
          studentName: myTicket.studentName || user.full_name || 'Nxënës'
        });
      } catch (err) {}
      Object.keys(localStorage).forEach(k => { 
        if(k.startsWith('notified_')) localStorage.removeItem(k); 
      });
    }
    setMyTicket(null);
    setIsCalled(false);
    setPeopleAhead(null);
    localStorage.removeItem('active_ticket');
  };

  // Polling
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    const checkQueueStatus = async () => {
      if (!myTicket) return;
      try {
        const queueRes = await axios.get(`http://localhost:5000/api/queue/${encodeURIComponent(myTicket.counterName)}`);
        const queue: any[] = queueRes.data;
        const myIndex = queue.findIndex(t => t.ticketNumber === myTicket.ticketNumber);
        
        if (myIndex !== -1) {
          setPeopleAhead(myIndex);
          setIsCalled(false);

          const proxKey = `notified_${myTicket.ticketNumber}_prox`;
          if ((myIndex === 1 || myIndex === 2) && !localStorage.getItem(proxKey)) {
            const msg = "Radha juaj po afrohet! Përgatituni pas pak. ⏳";
            toast(msg, { icon: '📢', duration: 6000 });
            setNotifications(prev => [msg, ...prev.slice(0, 4)]);
            localStorage.setItem(proxKey, 'true');
          }
          return;
        }

        const displayRes = await axios.get('http://localhost:5000/api/public-display');
        const displayData: any[] = displayRes.data;
        const myCounter = displayData.find(d => d.counterName === myTicket.counterName);
        
        if (myCounter && myCounter.currentStudent && myCounter.currentStudent.ticketNumber === myTicket.ticketNumber) {
          setIsCalled(true);
          setPeopleAhead(0);

          const calledKey = `notified_${myTicket.ticketNumber}_called`;
          if (!localStorage.getItem(calledKey)) {
             const msg = "ZGJEDHUR! E keni ju radhën te sporteli! 🔔";
             toast.success(msg, { duration: 8000 });
             setNotifications(prev => [msg, ...prev.slice(0, 4)]);
             localStorage.setItem(calledKey, 'true');
          }
        } else {
           let attempts = 0;
           const checkStatus = async () => {
             const ticketToCheck = localStorage.getItem('active_ticket');
             if (!ticketToCheck) return;
             const parsedTicket = JSON.parse(ticketToCheck);
             
             try {
               const statusRes = await axios.get(`http://localhost:5000/api/ticket-status/${parsedTicket.ticketNumber}`);
               const finalStatus = statusRes.data?.status;
               
               let msg = "Shërbimi juaj përfundoi. Faleminderit! ✅";
               if (finalStatus === 'no-show') {
                 msg = "Ju nuk u paraqitët në kohë. Bileta u anulua. ❌";
                 toast.error(msg, { duration: 8000 });
               } else {
                 toast.success(msg, { duration: 8000 });
               }

               setNotifications(prev => [msg, ...prev.slice(0, 4)]);
               handleClearTicket();
             } catch (e) {
               attempts++;
               if (attempts < 5) {
                 setTimeout(checkStatus, 2000);
               } else {
                 toast.success("Shërbimi përfundoi. ✅");
                 handleClearTicket();
               }
             }
           };
           
           setTimeout(checkStatus, 1000);
        }
      } catch (err) {
        console.error("Gabim radhë", err);
      }
    };

    if (myTicket) {
      checkQueueStatus();
      interval = setInterval(checkQueueStatus, 4000);
    }
    return () => clearInterval(interval);
  }, [myTicket]);

  if (loading) return (
    <div style={s.loaderPage}>
      <div style={s.loaderSpinner}>⚡</div>
      <p style={{color: '#94a3b8', fontSize: '16px'}}>Duke u ngarkuar...</p>
    </div>
  );

  const sidebarStyle = isMobile 
    ? (menuOpen ? s.sidebarMobileOpen : s.sidebarMobileClosed)
    : s.sidebarDesktop;

  return (
    <div style={isMobile ? s.containerMobile : s.containerDesktop}>
      {/* Mobile Top Bar */}
      {isMobile && (
        <div style={s.mobileTopBar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={s.logoIconSmall}>⚡</div>
            <h2 style={{ margin: 0, color: '#0f172a', fontSize: '18px', fontWeight: '800' }}>QueueFlow</h2>
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} style={s.menuBtn}>
            {menuOpen ? '✖' : '☰'}
          </button>
        </div>
      )}

      {/* Sidebar */}
      <aside style={sidebarStyle as any}>
        {!isMobile && (
          <div style={s.logoArea}>
            <div style={s.logoMark}>⚡</div>
            <div>
              <h2 style={s.logoTitle}>QueueFlow</h2>
              <p style={s.logoSub}>Paneli i Nxënësit</p>
            </div>
          </div>
        )}

        <nav style={s.navMenu}>
          <div 
            style={activeTab === 'ticket' ? s.navActive : s.navBtn} 
            onClick={() => { setActiveTab('ticket'); setMenuOpen(false); }}
          >
            <span style={s.navIcon}>🎫</span> Bileta Ime
          </div>
          <div 
            style={activeTab === 'info' ? s.navActive : s.navBtn} 
            onClick={() => { setActiveTab('info'); setMenuOpen(false); }}
          >
            <span style={s.navIcon}>ℹ️</span> Informacione
          </div>
        </nav>

        <div style={s.sidebarFooter}>
          <div style={s.userInfo}>
            <div style={s.userAvatar}>
              {(user.full_name || 'N').charAt(0).toUpperCase()}
            </div>
            <div style={{flex: 1, minWidth: 0}}>
              <p style={s.userName}>{user.full_name || 'Nxënës'}</p>
              <p style={s.userRole}>Nxënës</p>
            </div>
          </div>
          <button onClick={handleLogout} style={s.logoutBtn}>🚪 Dalje (Logout)</button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={s.main}>
        <header style={s.dashboardHeader}>
          <div style={s.breadcrumb}>
            <span style={{ color: '#94a3b8' }}>Faqja Kryesore</span>
            <span style={{ color: '#cbd5e1', margin: '0 8px' }}>/</span>
            <span style={{ color: '#475569', fontWeight: '600' }}>Bileta Ime</span>
          </div>
          
          <div style={s.headerActions}>
            {/* Notifications */}
            <div style={{ position: 'relative' }}>
              <div 
                style={s.iconCircle} 
                onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false); }}
              >
                <span>🔔</span>
                {notifications.length > 0 && <div style={s.notifBadge}>{notifications.length}</div>}
              </div>
              
              {showNotifications && (
                <div style={s.dropdown}>
                  <p style={s.dropdownTitle}>Njoftimet</p>
                  {notifications.length > 0 ? notifications.map((n, i) => (
                    <div 
                      key={i} 
                      style={s.notifItem}
                      onClick={() => removeNotification(i)}
                      title="Kliko për ta fshirë"
                    >
                      <span style={{ fontSize: '16px' }}>📢</span>
                      <div style={{flex: 1, minWidth: 0}}>
                        <p style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: '#334155' }}>{n}</p>
                        <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94a3b8' }}>Sapo tani</p>
                      </div>
                    </div>
                  )) : (
                    <p style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px', margin: 0 }}>Nuk ka njoftime.</p>
                  )}
                </div>
              )}
            </div>

            {/* Profile */}
            <div style={{ position: 'relative' }}>
              <div 
                style={s.iconCircle} 
                onClick={() => { setShowProfile(!showProfile); setShowNotifications(false); }}
              >
                <span>👤</span>
              </div>

              {showProfile && (
                <div style={s.dropdown}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
                    <p style={{ margin: 0, fontWeight: '700', fontSize: '14px', color: '#1e293b' }}>{user.full_name || 'Nxënës'}</p>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#94a3b8' }}>{user.email || '—'}</p>
                  </div>
                  <div style={s.dropdownItem} onClick={handleLogout}>
                    <span style={{ color: '#ef4444' }}>🚪 Dil nga Sistemi</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <section style={s.welcomeSection}>
          <h1 style={s.welcomeTitle}>
            Përshëndetje, <span style={{color: '#1FBBA6'}}>{(user.full_name?.split(' ')[0]) || 'Nxënës'}</span>! 👋
          </h1>
          <p style={s.subTitle}>Merrni një biletë dhe prisni radhën tuaj me qetësi.</p>
        </section>

        {activeTab === 'ticket' ? (
          <div style={{ display: 'flex', gap: '24px', flexDirection: isMobile ? 'column' : 'row' }}>
            
            {!myTicket ? (
              /* GET TICKET CARD */
              <div style={s.getTicketCard}>
                <div style={s.getTicketIcon}>🎫</div>
                <h3 style={s.cardTitle}>Zgjidhni Shërbimin</h3>
                <p style={s.cardDesc}>
                  Zgjidhni sportelin tek i cili dëshironi të aplikoni ose të merrni informacion.
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
                  <div style={s.selectWrapper}>
                    <select 
                      value={selectedCounter} 
                      onChange={(e) => setSelectedCounter(e.target.value)}
                      style={s.selectInput}
                    >
                      {counters.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <button 
                    onClick={handleGetTicket} 
                    style={{...s.primaryBtn, opacity: counters.length === 0 ? 0.4 : 1}}
                    disabled={counters.length === 0}
                  >
                    Merr Biletën
                    <span style={{marginLeft: '8px'}}>🎫</span>
                  </button>
                </div>
              </div>
            ) : (
              /* ACTIVE TICKET */
              <div style={s.ticketCard}>
                <div style={s.ticketCardInner}>
                  {isCalled && (
                    <div style={s.calledBanner}>
                      <span style={s.calledDot} />
                      ZGJEDHUR! E keni ju radhën
                    </div>
                  )}
                  
                  <div style={s.ticketHeader}>
                    <span style={s.ticketLabel}>SPORTELI</span>
                    <h3 style={s.ticketCounterName}>{myTicket.counterName}</h3>
                  </div>
                  
                  <div style={s.ticketBadgeArea}>
                    <div style={s.ticketBadge}>#{myTicket.ticketNumber}</div>
                  </div>
                  
                  <div style={{
                    ...s.statusBox,
                    background: isCalled ? 'linear-gradient(135deg, #ecfdf5, #d1fae5)' : '#f8fafc',
                    border: isCalled ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                  }}>
                    {isCalled ? (
                      <div style={{textAlign: 'center'}}>
                        <p style={{ margin: 0, fontSize: '17px', color: '#047857', fontWeight: '700' }}>Afrohuni te sporteli tani!</p>
                        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#065f46' }}>Stafi po ju pret.</p>
                      </div>
                    ) : (
                      <div style={{textAlign: 'center'}}>
                        <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>Njerëz para jush</p>
                        <h2 style={{ margin: '6px 0 0', fontSize: '40px', fontWeight: '900', color: '#0f172a', lineHeight: '1' }}>{peopleAhead !== null ? peopleAhead : '...'}</h2>
                      </div>
                    )}
                  </div>
                </div>

                <button onClick={handleClearTicket} style={s.cancelTicketBtn}>
                  ✕ {isCalled ? 'Mbyll Biletën' : 'Anulo Biletën'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={s.infoCard}>
            <div style={s.infoIcon}>📋</div>
            <h3 style={s.infoTitle}>Rregullat e Sistemit</h3>
            <div style={s.rulesList}>
              <div style={s.ruleItem}>
                <span style={s.ruleBullet}>1</span>
                <p style={s.ruleText}>Qëndroni në sallën e pritjes deri në thirrjen e biletës suaj.</p>
              </div>
              <div style={s.ruleItem}>
                <span style={s.ruleBullet}>2</span>
                <p style={s.ruleText}>Sistemi do t'ju shfaqë njoftimin në ekranin tuaj si dhe në TV.</p>
              </div>
              <div style={s.ruleItem}>
                <span style={s.ruleBullet}>3</span>
                <p style={s.ruleText}>Nëse nuk paraqiteni kur thirreni, radha do të anulohet nga stafi.</p>
              </div>
              <div style={s.ruleItem}>
                <span style={s.ruleBullet}>4</span>
                <p style={s.ruleText}>Mundësohet marrja e vetëm një bilete aktive njëkohësisht.</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const s: { [key: string]: React.CSSProperties } = {
  containerDesktop: { display: 'flex', height: '100vh', background: '#f8fafc', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" },
  containerMobile: { display: 'flex', flexDirection: 'column', height: '100vh', background: '#f8fafc', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" },
  
  // Sidebar
  sidebarDesktop: { width: '280px', background: 'linear-gradient(180deg, #0f172a, #1e293b)', display: 'flex', flexDirection: 'column', padding: '0', flexShrink: 0 },
  sidebarMobileClosed: { display: 'none' },
  sidebarMobileOpen: { position: 'absolute', top: '65px', left: 0, width: '100%', height: 'calc(100vh - 65px)', background: 'linear-gradient(180deg, #0f172a, #1e293b)', display: 'flex', flexDirection: 'column', padding: '20px 16px', zIndex: 50 },
  
  mobileTopBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', zIndex: 60, borderBottom: '1px solid #f1f5f9' },
  menuBtn: { background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#1e293b', padding: '4px' },
  logoIconSmall: { background: 'linear-gradient(135deg, #1FBBA6, #14917e)', color: '#fff', padding: '6px 10px', borderRadius: '10px', fontSize: '16px' },

  logoArea: { display: 'flex', alignItems: 'center', gap: '14px', padding: '28px 24px 35px', borderBottom: '1px solid rgba(255,255,255,0.06)' },
  logoMark: { background: 'linear-gradient(135deg, #1FBBA6, #14917e)', padding: '10px 14px', borderRadius: '14px', fontSize: '22px' },
  logoTitle: { color: '#f8fafc', margin: 0, fontSize: '20px', fontWeight: '800', letterSpacing: '-0.3px' },
  logoSub: { color: '#64748b', margin: 0, fontSize: '12px', fontWeight: '500' },
  
  navMenu: { flex: 1, padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '4px' },
  navBtn: { display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 16px', color: '#94a3b8', borderRadius: '12px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' },
  navActive: { display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 16px', background: 'linear-gradient(135deg, rgba(31,187,166,0.15), rgba(31,187,166,0.05))', color: '#1FBBA6', borderRadius: '12px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', border: '1px solid rgba(31,187,166,0.2)' },
  navIcon: { fontSize: '18px', width: '24px', textAlign: 'center' },
  
  sidebarFooter: { padding: '20px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '14px' },
  userInfo: { display: 'flex', alignItems: 'center', gap: '12px', padding: '0 4px' },
  userAvatar: { width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #1FBBA6, #14917e)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '700', fontSize: '14px', flexShrink: 0 },
  userName: { margin: 0, color: '#e2e8f0', fontWeight: '600', fontSize: '13px' },
  userRole: { margin: 0, color: '#64748b', fontSize: '11px' },
  logoutBtn: { width: '100%', padding: '10px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', color: '#f87171', borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', textAlign: 'center', fontFamily: 'Inter, sans-serif' },
  
  // Main
  main: { flex: 1, padding: 'clamp(20px, 4vw, 36px)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' },
  dashboardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  breadcrumb: { fontSize: '13px', fontWeight: '500' },
  headerActions: { display: 'flex', gap: '10px' },
  iconCircle: { width: '42px', height: '42px', background: '#fff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', cursor: 'pointer', border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', position: 'relative' },
  notifBadge: { position: 'absolute', top: '-4px', right: '-4px', background: '#ef4444', color: '#fff', fontSize: '10px', width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', border: '2px solid #f8fafc' },
  dropdown: { position: 'absolute', top: '52px', right: 0, width: '300px', background: '#fff', borderRadius: '16px', boxShadow: '0 12px 40px rgba(0,0,0,0.12)', border: '1px solid #f1f5f9', zIndex: 100, overflow: 'hidden' },
  dropdownTitle: { padding: '14px 20px', margin: 0, fontSize: '13px', fontWeight: '700', borderBottom: '1px solid #f1f5f9', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' },
  dropdownItem: { padding: '12px 20px', cursor: 'pointer', fontSize: '14px', transition: 'background 0.1s' },
  notifItem: { padding: '12px 20px', borderBottom: '1px solid #f8fafc', display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer', transition: 'background 0.1s' },
  
  welcomeSection: { marginBottom: '4px' },
  welcomeTitle: { fontSize: 'clamp(24px, 4vw, 30px)', fontWeight: '800', color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.5px' },
  subTitle: { color: '#94a3b8', margin: 0, fontSize: 'clamp(13px, 2vw, 15px)' },
  
  // Get Ticket Card
  getTicketCard: { flex: 1, maxWidth: '480px', background: '#fff', padding: '36px', borderRadius: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' },
  getTicketIcon: { fontSize: '40px', marginBottom: '16px', width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', borderRadius: '16px' },
  cardTitle: { fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px', letterSpacing: '-0.3px' },
  cardDesc: { color: '#94a3b8', marginBottom: '24px', fontSize: '14px', lineHeight: '1.6' },
  selectWrapper: { width: '100%' },
  selectInput: { width: '100%', padding: '14px 16px', borderRadius: '12px', border: '2px solid #e2e8f0', fontSize: '15px', outline: 'none', background: '#f8fafc', color: '#334155', fontFamily: 'Inter, sans-serif', cursor: 'pointer', boxSizing: 'border-box' },
  primaryBtn: { width: '100%', padding: '14px', background: 'linear-gradient(135deg, #1FBBA6, #14917e)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 15px rgba(31, 187, 166, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' },

  // Active Ticket Card
  ticketCard: { flex: '1 1 auto', maxWidth: '480px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' },
  ticketCardInner: { width: '100%', background: '#fff', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9', position: 'relative' },
  calledBanner: { background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', padding: '10px 20px', textAlign: 'center', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', letterSpacing: '0.5px' },
  calledDot: { width: '8px', height: '8px', borderRadius: '50%', background: '#fff', animation: 'pulse 1.5s infinite' },
  ticketHeader: { padding: '24px 28px 0' },
  ticketLabel: { color: '#94a3b8', fontWeight: '700', margin: 0, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px' },
  ticketCounterName: { fontSize: '22px', margin: '4px 0 0', color: '#1e293b', fontWeight: '800' },
  ticketBadgeArea: { padding: '24px 28px', textAlign: 'center' },
  ticketBadge: { display: 'inline-block', color: '#10b981', padding: '16px 32px', borderRadius: '16px', fontSize: '48px', fontWeight: '900', border: '3px dashed #10b981', background: 'rgba(16, 185, 129, 0.04)', letterSpacing: '-1px' },
  statusBox: { margin: '0 20px 24px', padding: '20px', borderRadius: '14px',  },
  cancelTicketBtn: { padding: '11px 24px', background: '#fff', color: '#94a3b8', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s' },

  // Info Card
  infoCard: { background: '#fff', padding: '36px', borderRadius: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9', maxWidth: '600px' },
  infoIcon: { fontSize: '36px', marginBottom: '12px' },
  infoTitle: { fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '0 0 20px' },
  rulesList: { display: 'flex', flexDirection: 'column', gap: '14px' },
  ruleItem: { display: 'flex', alignItems: 'flex-start', gap: '14px' },
  ruleBullet: { width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg, #1FBBA6, #14917e)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '800', flexShrink: 0 },
  ruleText: { margin: 0, color: '#475569', fontSize: '14px', lineHeight: '1.6', paddingTop: '3px' },

  // Loader
  loaderPage: { height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' },
  loaderSpinner: { fontSize: '40px', marginBottom: '12px' },
};

export default Dashboard;