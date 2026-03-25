import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [msg, setMsg] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); // Ndalon rifreskimin e faqes
    setLoading(true);
    setMsg('');

    try {
      console.log("Duke dërguar kërkesën...");
      
      const res = await axios.post('http://localhost:5000/api/login', { email, password });
      
      // Kontrolli nëse serveri ktheu të dhëna
      if (!res.data || !res.data.user) {
        setMsg("Të dhënat e përdoruesit nuk u morën nga serveri.");
        setLoading(false);
        return;
      }

      const { session, user } = res.data;

      // Përgatitja e të dhënave
      const userId = user.id || user._id;
      const userRole = user.role ? user.role.toLowerCase().trim() : '';
      const fullName = user.fullName || user.full_name || 'Përdorues';

      console.log("Të dhënat e login-it:", { userId, userRole });

      // Ruajtja në LocalStorage
      localStorage.setItem('token', session?.access_token || '');
      localStorage.setItem('role', userRole);
      
      const userObj = {
        id: userId,
        full_name: fullName,
        role: userRole,
        department: user.department || ''
      };

      localStorage.setItem('user', JSON.stringify(userObj));

      // RIDREJTIMI ME NJË VONESË TË VOGËL (për të shmangur reload-in e gabuar)
      setTimeout(() => {
        if (userRole === 'admin') {
          console.log("Ridrejtim: Admin");
          navigate('/admin-dashboard');
        } else if (userRole === 'staf-admin' || userRole === 'staff') {
          console.log("Ridrejtim: Staff");
          navigate('/staff-dashboard');
        } else {
          console.log("Ridrejtim: Dashboard");
          navigate('/dashboard');
        }
      }, 100);

    } catch (err: any) {
      console.error("GABIM NE LOGIN:", err);
      setMsg(err.response?.data?.error || "Email ose fjalëkalimi është i gabuar!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.iconCircle}>🎓</div>
        <h1 style={styles.title}>Mirë se vini</h1>
        <p style={styles.subtitle}>Identifikohu në sistemin SQMS</p>
      </div>

      <div style={styles.card}>
        <form onSubmit={handleLogin}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Adresa</label>
            <input 
              type="email" 
              placeholder="emri@email.com" 
              style={styles.input} 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Fjalëkalimi</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              style={styles.input} 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>

          <div style={styles.forgotContainer}>
            <Link to="/forgot-password" style={styles.forgotLink}>
              Harrove fjalëkalimin?
            </Link>
          </div>

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Duke u procesuar..." : "Identifikohu →"}
          </button>
        </form>

        <div style={styles.footer}>
          Nuk ke llogari? <Link to="/register" style={styles.link}>Regjistrohu këtu</Link>
        </div>
      </div>

      {msg && (
        <div style={styles.errorBox}>
          {msg}
        </div>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f4f7f6', fontFamily: "'Segoe UI', Tahoma, sans-serif", padding: '20px' },
  header: { textAlign: 'center', marginBottom: '30px' },
  iconCircle: { backgroundColor: '#e6f4f1', color: '#1fbba6', width: '70px', height: '70px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '35px', margin: '0 auto 15px auto' },
  title: { fontSize: '32px', fontWeight: 'bold', color: '#222', margin: '5px 0' },
  subtitle: { color: '#666', fontSize: '16px' },
  card: { backgroundColor: '#fff', padding: '45px', borderRadius: '25px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', width: '100%', maxWidth: '500px' },
  inputGroup: { marginBottom: '20px' },
  label: { display: 'block', fontWeight: '600', fontSize: '15px', color: '#333', marginBottom: '8px' },
  input: { width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #ddd', backgroundColor: '#fafafa', boxSizing: 'border-box', fontSize: '16px', outline: 'none' },
  forgotContainer: { textAlign: 'right', marginBottom: '25px' },
  forgotLink: { color: '#1fbba6', textDecoration: 'none', fontSize: '14px', fontWeight: '500' },
  button: { width: '100%', padding: '16px', backgroundColor: '#1fbba6', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' },
  footer: { textAlign: 'center', marginTop: '25px', fontSize: '15px', color: '#777' },
  link: { color: '#1fbba6', textDecoration: 'none', fontWeight: 'bold' },
  errorBox: { marginTop: '20px', padding: '12px', borderRadius: '10px', backgroundColor: '#ffebee', color: '#c62828', fontWeight: 'bold', maxWidth: '500px', textAlign: 'center', width: '100%', boxSizing: 'border-box' }
};

export default Login;