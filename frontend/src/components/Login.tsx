import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [msg, setMsg] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');

    try {
      const res = await axios.post('http://localhost:5000/api/login', { email, password });
      
      if (!res.data || !res.data.user) {
        setMsg("Të dhënat e përdoruesit nuk u morën nga serveri.");
        setLoading(false);
        return;
      }

      const { session, user } = res.data;
      const userId = user.id || user._id;
      const userRole = user.role ? user.role.toLowerCase().trim() : '';
      const fullName = user.fullName || user.full_name || 'Përdorues';

      localStorage.setItem('token', session?.access_token || '');
      localStorage.setItem('role', userRole);
      
      const userObj = {
        id: userId,
        full_name: fullName !== 'Përdorues' ? fullName : '',
        email: email,
        role: userRole,
        department: user.department || ''
      };

      localStorage.setItem('user', JSON.stringify(userObj));
      localStorage.setItem('userEmail', email);

      setTimeout(() => {
        if (userRole === 'admin') {
          window.location.href = '/admin-dashboard';
        } else if (userRole === 'staf-admin' || userRole === 'staff' || userRole === 'staf') {
          window.location.href = '/staff-dashboard';
        } else {
          window.location.href = '/dashboard';
        }
      }, 300);

    } catch (err: any) {
      console.error("GABIM NE LOGIN:", err);
      setMsg(err.response?.data?.error || "Email ose fjalëkalimi është i gabuar!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.wrapper}>
      {/* Background decoration */}
      <div style={styles.bgOrb1} />
      <div style={styles.bgOrb2} />
      <div style={styles.bgOrb3} />

      <div style={styles.container}>
        {/* Left side - Branding */}
        <div style={styles.brandSide}>
          <div style={styles.brandContent}>
            <div style={styles.logoRow}>
              <div style={styles.logoIcon}>⚡</div>
              <span style={styles.logoLabel}>QueueFlow</span>
            </div>
            <h1 style={styles.brandTitle}>Sistemi i Menaxhimit të Radhës Shkollore</h1>
            <p style={styles.brandDesc}>Platforma moderne për organizimin e radhëve, biletave dhe shërbimeve shkollore me efikasitet maksimal.</p>
            
            <div style={styles.featureList}>
              <div style={styles.featureItem}>
                <div style={styles.featureIcon}>🎫</div>
                <div>
                  <p style={styles.featureTitle}>Bileta Digjitale</p>
                  <p style={styles.featureDesc}>Merr biletën online pa pritje fizike</p>
                </div>
              </div>
              <div style={styles.featureItem}>
                <div style={styles.featureIcon}>📊</div>
                <div>
                  <p style={styles.featureTitle}>Monitorim Live</p>
                  <p style={styles.featureDesc}>Ndiq radhën në kohë reale</p>
                </div>
              </div>
              <div style={styles.featureItem}>
                <div style={styles.featureIcon}>🔔</div>
                <div>
                  <p style={styles.featureTitle}>Njoftime Automatike</p>
                  <p style={styles.featureDesc}>Merr njoftim kur të vjen radha</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Login Form */}
        <div style={styles.formSide}>
          <div style={styles.formContainer}>
            <div style={styles.formHeader}>
              <div style={styles.avatarCircle}>
                <span style={{ fontSize: '28px' }}>🎓</span>
              </div>
              <h2 style={styles.formTitle}>Mirë se vini!</h2>
              <p style={styles.formSubtitle}>Identifikohu për të vazhduar</p>
            </div>

            <form onSubmit={handleLogin} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Email Adresa</label>
                <div style={styles.inputWrapper}>
                  <span style={styles.inputIcon}>✉️</span>
                  <input 
                    type="email" 
                    placeholder="emri@email.com" 
                    style={styles.input} 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                  />
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Fjalëkalimi</label>
                <div style={styles.inputWrapper}>
                  <span style={styles.inputIcon}>🔒</span>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••" 
                    style={styles.input} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required 
                  />
                  <span 
                    style={styles.eyeIcon} 
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </span>
                </div>
              </div>

              <div style={styles.forgotRow}>
                <Link to="/forgot-password" style={styles.forgotLink}>
                  Harrove fjalëkalimin?
                </Link>
              </div>

              {msg && (
                <div style={styles.errorBox}>
                  <span style={{ marginRight: '8px' }}>⚠️</span>{msg}
                </div>
              )}

              <button type="submit" style={{
                ...styles.submitBtn,
                opacity: loading ? 0.7 : 1,
                transform: loading ? 'none' : undefined,
              }} disabled={loading}>
                {loading ? (
                  <span style={styles.loadingSpinner}>⟳ Duke u procesuar...</span>
                ) : (
                  <>Identifikohu <span style={{ marginLeft: '8px' }}>→</span></>
                )}
              </button>
            </form>

            <div style={styles.divider}>
              <span style={styles.dividerLine} />
              <span style={styles.dividerText}>ose</span>
              <span style={styles.dividerLine} />
            </div>

            <p style={styles.footer}>
              Nuk ke llogari?{' '}
              <Link to="/register" style={styles.registerLink}>Regjistrohu këtu</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    padding: '20px',
    position: 'relative',
    overflow: 'hidden',
  },
  bgOrb1: {
    position: 'absolute',
    width: '500px',
    height: '500px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(31, 187, 166, 0.15) 0%, transparent 70%)',
    top: '-100px',
    right: '-100px',
    pointerEvents: 'none' as any,
  },
  bgOrb2: {
    position: 'absolute',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
    bottom: '-80px',
    left: '-80px',
    pointerEvents: 'none' as any,
  },
  bgOrb3: {
    position: 'absolute',
    width: '300px',
    height: '300px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(31, 187, 166, 0.08) 0%, transparent 70%)',
    top: '50%',
    left: '30%',
    pointerEvents: 'none' as any,
  },
  container: {
    display: 'flex',
    flexWrap: 'wrap',
    width: '100%',
    maxWidth: '1100px',
    minHeight: '650px',
    borderRadius: '24px',
    overflow: 'hidden',
    boxShadow: '0 25px 80px rgba(0, 0, 0, 0.4)',
    position: 'relative' as any,
    zIndex: 1,
  },
  brandSide: {
    flex: '1 1 420px',
    background: 'linear-gradient(160deg, #1FBBA6 0%, #14917e 50%, #0f766e 100%)',
    padding: 'clamp(30px, 6vw, 60px)',
    display: 'flex',
    flexDirection: 'column' as any,
    justifyContent: 'center',
    position: 'relative' as any,
  },
  brandContent: {
    position: 'relative' as any,
    zIndex: 2,
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '35px',
  },
  logoIcon: {
    background: 'rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(10px)',
    padding: '10px 14px',
    borderRadius: '14px',
    fontSize: '24px',
  },
  logoLabel: {
    color: '#fff',
    fontSize: '22px',
    fontWeight: '800',
    letterSpacing: '-0.5px',
  },
  brandTitle: {
    color: '#fff',
    fontSize: 'clamp(20px, 3.4vw, 32px)',
    fontWeight: '800',
    lineHeight: '1.2',
    marginBottom: '16px',
    letterSpacing: '-0.5px',
  },
  brandDesc: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: '15px',
    lineHeight: '1.7',
    marginBottom: '40px',
  },
  featureList: {
    display: 'flex',
    flexDirection: 'column' as any,
    gap: '20px',
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    padding: '14px 18px',
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    borderRadius: '14px',
    border: '1px solid rgba(255, 255, 255, 0.15)',
  },
  featureIcon: {
    fontSize: '24px',
    width: '44px',
    height: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255, 255, 255, 0.15)',
    borderRadius: '12px',
    flexShrink: 0,
  },
  featureTitle: {
    color: '#fff',
    fontWeight: '700',
    fontSize: '14px',
    margin: '0 0 3px 0',
  },
  featureDesc: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '12px',
    margin: 0,
  },
  formSide: {
    flex: '1 1 420px',
    background: '#fff',
    padding: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formContainer: {
    width: '100%',
    maxWidth: '420px',
    padding: 'clamp(22px, 6vw, 50px)',
  },
  formHeader: {
    textAlign: 'center' as any,
    marginBottom: '35px',
  },
  avatarCircle: {
    width: 'clamp(48px, 8vw, 68px)',
    height: 'clamp(48px, 8vw, 68px)',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #e6faf7, #d1fae5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px auto',
    boxShadow: '0 4px 15px rgba(31, 187, 166, 0.15)',
  },
  formTitle: {
    fontSize: '26px',
    fontWeight: '800',
    color: '#0f172a',
    margin: '0 0 6px 0',
    letterSpacing: '-0.5px',
  },
  formSubtitle: {
    color: '#94a3b8',
    fontSize: '14px',
    margin: 0,
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as any,
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column' as any,
    gap: '7px',
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#475569',
    letterSpacing: '0.3px',
  },
  inputWrapper: {
    position: 'relative' as any,
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute' as any,
    left: '14px',
    fontSize: '16px',
    pointerEvents: 'none' as any,
    opacity: 0.6,
  },
  input: {
    width: '100%',
    padding: '14px 14px 14px 44px',
    borderRadius: '12px',
    border: '2px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    fontSize: '15px',
    outline: 'none',
    transition: 'all 0.2s',
    color: '#1e293b',
    boxSizing: 'border-box' as any,
    fontFamily: 'Inter, sans-serif',
  },
  eyeIcon: {
    position: 'absolute' as any,
    right: '14px',
    cursor: 'pointer',
    fontSize: '16px',
    opacity: 0.5,
    userSelect: 'none' as any,
  },
  forgotRow: {
    textAlign: 'right' as any,
    marginTop: '-8px',
  },
  forgotLink: {
    color: '#1FBBA6',
    textDecoration: 'none',
    fontSize: '13px',
    fontWeight: '600',
  },
  errorBox: {
    padding: '12px 16px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
    color: '#dc2626',
    fontSize: '13px',
    fontWeight: '600',
    border: '1px solid #fecaca',
    display: 'flex',
    alignItems: 'center',
  },
  submitBtn: {
    width: '100%',
    padding: '15px',
    background: 'linear-gradient(135deg, #1FBBA6, #14917e)',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 15px rgba(31, 187, 166, 0.3)',
    letterSpacing: '0.3px',
    fontFamily: 'Inter, sans-serif',
  },
  loadingSpinner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    margin: '25px 0',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    background: '#e2e8f0',
  },
  dividerText: {
    color: '#94a3b8',
    fontSize: '12px',
    fontWeight: '500',
  },
  footer: {
    textAlign: 'center' as any,
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
  },
  registerLink: {
    color: '#1FBBA6',
    textDecoration: 'none',
    fontWeight: '700',
  },
};

export default Login;