import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface CounterData {
  counterName: string;
  currentStudent: {
    id: string;
    studentName: string;
    ticketNumber: string;
    timestamp: string;
  } | null;
}

const DisplayDashboard = () => {
  const [counters, setCounters] = useState<CounterData[]>([]);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [updatedMap, setUpdatedMap] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<'tv' | 'desktop' | 'mobile'>('desktop');

  const fetchDisplayData = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/public-display');
      const newData: CounterData[] = res.data;

      const prevMap: Record<string, string | null> = {};
      counters.forEach(c => prevMap[c.counterName] = c.currentStudent ? c.currentStudent.ticketNumber : null);

      const updates: Record<string, boolean> = {};
      newData.forEach(c => {
        const prev = prevMap[c.counterName] ?? null;
        const curr = c.currentStudent ? c.currentStudent.ticketNumber : null;
        if (curr && curr !== prev) updates[c.counterName] = true;
      });

      if (Object.keys(updates).length > 0) {
        setUpdatedMap(s => ({ ...s, ...updates }));
        Object.keys(updates).forEach(name => setTimeout(() => {
          setUpdatedMap(s => ({ ...s, [name]: false }));
        }, 2000));
      }

      setCounters(newData);
    } catch (err) {
      console.error('Error fetching display data:', err);
    }
  };

  useEffect(() => {
    fetchDisplayData();
    const interval = setInterval(fetchDisplayData, 1000);
    
    const timeInterval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDate(now.toLocaleDateString('sq-AL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    }, 1000);

    const handleResize = () => {
      const w = window.innerWidth;
      if (w >= 1400) setViewMode('tv');
      else if (w >= 900) setViewMode('desktop');
      else setViewMode('mobile');
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(interval);
      clearInterval(timeInterval);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const activeCount = counters.filter(c => c.currentStudent).length;

  return (
    <div style={s.container}>
      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes glow { 0%, 100% { box-shadow: 0 0 30px rgba(31, 187, 166, 0.15); } 50% { box-shadow: 0 0 50px rgba(31, 187, 166, 0.3); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes scrollText { 0% { transform: translateX(100vw); } 100% { transform: translateX(-100%); } }
        @keyframes fadeInScale { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
      `}</style>

      {/* HEADER */}
      <header style={s.header}>
        <div style={s.headerLeft}>
          <div style={s.headerLogo}>⚡</div>
          <div>
            <h1 style={s.headerTitle}>QueueFlow</h1>
            <p style={s.headerSub}>Sistemi i Menaxhimit të Radhës</p>
          </div>
        </div>
        <div style={s.headerRight}>
          <div style={s.statsRow}>
            <div style={s.headerStat}>
              <span style={s.headerStatValue}>{counters.length}</span>
              <span style={s.headerStatLabel}>Sportele</span>
            </div>
            <div style={s.headerStatDivider} />
            <div style={s.headerStat}>
              <span style={{...s.headerStatValue, color: activeCount > 0 ? '#10b981' : '#475569'}}>{activeCount}</span>
              <span style={s.headerStatLabel}>Aktive</span>
            </div>
          </div>
          <div style={s.timeBlock}>
            <div style={s.timeDisplay}>{currentTime}</div>
            <div style={s.dateDisplay}>{currentDate}</div>
          </div>
        </div>
      </header>

      {/* MAIN GRID */}
      <main style={s.main}>
        {(() => {
          let cols = 3;
          const count = counters.length;
          if (viewMode === 'mobile') cols = 1;
          else if (count === 1) cols = 1;
          else if (count === 2) cols = 2;
          else if (count <= 4) cols = 2;
          else if (count <= 6) cols = 3;
          else cols = 4;

          return (
            <div style={{ ...s.grid, gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
              {counters.map((counter, i) => {
                const isUpdated = !!updatedMap[counter.counterName];
                const hasStudent = !!counter.currentStudent;

                return (
                  <div 
                    key={i} 
                    style={{
                      ...s.card,
                      ...(isUpdated ? { animation: 'fadeInScale 0.5s ease-out', boxShadow: '0 0 40px rgba(31, 187, 166, 0.25)' } : {}),
                      ...(hasStudent ? { borderTop: '4px solid #1FBBA6' } : { borderTop: '4px solid #e2e8f0' }),
                    }}
                  >
                    {/* Counter Header */}
                    <div style={s.cardHeader}>
                      <div style={s.cardHeaderLeft}>
                        <div style={{
                          ...s.cardDot,
                          background: hasStudent ? '#10b981' : '#475569',
                          boxShadow: hasStudent ? '0 0 10px rgba(16, 185, 129, 0.5)' : 'none',
                        }} />
                        <h2 style={s.cardCounterName}>{counter.counterName}</h2>
                      </div>
                      <span style={{
                        ...s.cardStatus,
                        color: hasStudent ? '#10b981' : '#475569',
                        background: hasStudent ? 'rgba(16, 185, 129, 0.1)' : 'rgba(71, 85, 105, 0.1)',
                      }}>
                        {hasStudent ? '● AKTIV' : '○ I LIRË'}
                      </span>
                    </div>

                    {/* Content */}
                    <div style={s.cardBody}>
                      {counter.currentStudent ? (
                        <div style={s.studentContent}>
                          <p style={s.servingLabel}>Tani po shërben:</p>
                          <div style={s.ticketNumber}>
                            #{counter.currentStudent.ticketNumber}
                          </div>
                          <p style={s.studentName}>
                            {counter.currentStudent.studentName}
                          </p>
                        </div>
                      ) : (
                        <div style={s.emptyContent}>
                          <div style={s.emptyIcon}>🏢</div>
                          <p style={s.emptyText}>
                            Sporteli i Lirë
                          </p>
                          <p style={s.emptySubText}>Duke pritur nxënësin e radhës</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {counters.length === 0 && (
                <div style={s.noCounters}>
                  <span style={{ fontSize: '48px', marginBottom: '16px' }}>🖥️</span>
                  <p>Nuk ka sportele aktive për momentin.</p>
                </div>
              )}
            </div>
          );
        })()}
      </main>
      
      {/* FOOTER MARQUEE */}
      <footer style={s.footer}>
        <div style={{
          display: 'inline-block',
          animation: 'scrollText 25s linear infinite',
          paddingRight: '100%',
          whiteSpace: 'nowrap',
        }}>
          <span style={s.marqueeText}>
            📢 Të nderuar nxënës, ju lutemi ndiqni radhën me rregull. Pasi të thirret bileta juaj, afrohuni te sporteli përkatës!
            &nbsp;&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;&nbsp;
            ⚡ QueueFlow — Sistemi i Menaxhimit të Radhës Shkollore
          </span>
        </div>
      </footer>
    </div>
  );
};

const s: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    background: '#f8fafc',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    overflow: 'hidden',
  },

  // Header
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 40px',
    background: '#fff',
    borderBottom: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    zIndex: 10,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  headerLogo: {
    background: 'linear-gradient(135deg, #1FBBA6, #14917e)',
    padding: '12px 16px',
    borderRadius: '14px',
    color: '#fff',
    fontSize: '28px',
    boxShadow: '0 4px 15px rgba(31, 187, 166, 0.3)',
  },
  headerTitle: {
    color: '#0f172a',
    margin: 0,
    fontSize: '28px',
    fontWeight: '800',
    letterSpacing: '-0.5px',
  },
  headerSub: {
    color: '#64748b',
    margin: '2px 0 0',
    fontSize: '13px',
    fontWeight: '500',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '30px',
  },
  statsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  headerStat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  headerStatValue: {
    color: '#1FBBA6',
    fontSize: '28px',
    fontWeight: '900',
    lineHeight: '1',
  },
  headerStatLabel: {
    color: '#64748b',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginTop: '2px',
  },
  headerStatDivider: {
    width: '1px',
    height: '36px',
    background: '#e2e8f0',
  },
  timeBlock: {
    textAlign: 'right',
  },
  timeDisplay: {
    color: '#1FBBA6',
    fontSize: '32px',
    fontWeight: '800',
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '1px',
  },
  dateDisplay: {
    color: '#475569',
    fontSize: '12px',
    fontWeight: '500',
    marginTop: '2px',
    textTransform: 'capitalize',
  },

  // Main
  main: {
    flex: 1,
    padding: '30px 40px',
    overflow: 'hidden',
  },
  grid: {
    display: 'grid',
    gap: '24px',
    alignItems: 'stretch',
    height: '100%',
  },

  // Cards
  card: {
    background: '#fff',
    borderRadius: '16px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    border: '1px solid #f1f5f9',
    transition: 'all 0.3s ease',
    minHeight: '280px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '18px 24px',
    borderBottom: '1px solid #f1f5f9',
  },
  cardHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  cardDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  cardCounterName: {
    margin: 0,
    color: '#1e293b',
    fontSize: '18px',
    fontWeight: '700',
  },
  cardStatus: {
    fontSize: '11px',
    fontWeight: '700',
    padding: '5px 12px',
    borderRadius: '20px',
    letterSpacing: '0.5px',
  },

  // Student content
  cardBody: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '30px 24px',
  },
  studentContent: {
    textAlign: 'center',
    width: '100%',
  },
  servingLabel: {
    color: '#94a3b8',
    fontSize: '14px',
    margin: '0 0 12px 0',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '2px',
  },
  ticketNumber: {
    color: '#1FBBA6',
    fontSize: '80px',
    fontWeight: '900',
    lineHeight: '1',
    marginBottom: '12px',
    letterSpacing: '-2px',
  },
  studentName: {
    color: '#334155',
    fontSize: '28px',
    fontWeight: '700',
    margin: 0,
    textAlign: 'center',
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  // Empty state
  emptyContent: {
    textAlign: 'center',
    opacity: 0.8,
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '12px',
    opacity: 0.5,
  },
  emptyText: {
    color: '#cbd5e1',
    fontSize: '52px',
    fontWeight: '900',
    lineHeight: '1.1',
    margin: '0',
  },
  emptySubText: {
    color: '#94a3b8',
    fontSize: '13px',
    margin: '6px 0 0 0',
  },
  noCounters: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '80px',
    color: '#64748b',
    fontSize: '20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },

  // Footer
  footer: {
    background: '#1FBBA6',
    padding: '14px 0',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
  },
  marqueeText: {
    color: '#fff',
    fontSize: '20px',
    fontWeight: '700',
    letterSpacing: '0.3px',
  },
};

export default DisplayDashboard;
