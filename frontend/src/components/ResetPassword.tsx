import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

const ResetPassword = () => {
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [msg, setMsg] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const navigate = useNavigate();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setMsg("Gabim: Fjalëkalimet nuk përputhen!");
      return;
    }

    setLoading(true);
    setMsg('');

    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace('#', '?'));
    const accessToken = params.get('access_token');

    if (!accessToken) {
      setMsg("Gabim: Token-i mungon ose ka skaduar.");
      setLoading(false);
      return;
    }

    try {
      const res = await axios.post('http://localhost:5000/api/update-password', {
        new_password: password,
        access_token: accessToken
      });

      setMsg(res.data.message || "Fjalëkalimi u ndryshua me sukses!");
      setTimeout(() => navigate('/login'), 3000);
      
    } catch (err: any) {
      setMsg(err.response?.data?.error || "Ndodhi një gabim gjatë procesit.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.iconCircle}>🎓</div>
        <h1 style={styles.title}>Fjalëkalim i Ri</h1>
        <p style={styles.subtitle}>Vendosni fjalëkalimin tuaj të ri</p>
      </div>

      <div style={styles.card}>
        <form onSubmit={handleReset}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Fjalëkalimi i ri</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              style={styles.input} 
              value={password}
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Konfirmo fjalëkalimin</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              style={styles.input} 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)} 
              required 
            />
          </div>

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Duke u ruajtur..." : "Përditëso Fjalëkalimin"}
          </button>
        </form>

        <div style={styles.footer}>
          <Link to="/login" style={styles.link}>Kthehu te identifikimi</Link>
        </div>
      </div>

      {msg && (
        <div style={{
          ...styles.messageBox,
          backgroundColor: msg.includes('Gabim') || msg.includes('Ndodhi') ? '#ffebee' : '#e8f5e9',
          color: msg.includes('Gabim') || msg.includes('Ndodhi') ? '#c62828' : '#2e7d32',
        }}>
          {msg}
        </div>
      )}
    </div>
  );
};

// --- STILIMI I RRITUR ---
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f4f7f6',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    padding: '40px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  iconCircle: {
    backgroundColor: '#e6f4f1',
    color: '#1fbba6',
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '40px',
    margin: '0 auto 20px auto',
  },
  title: {
    fontSize: 'clamp(24px, 4vw, 36px)',
    fontWeight: 'bold',
    color: '#222',
    margin: '10px 0',
  },
  subtitle: {
    color: '#666',
    fontSize: 'clamp(14px, 2.5vw, 18px)',
  },
  card: {
    backgroundColor: '#fff',
    padding: 'clamp(24px, 5vw, 60px)', 
    borderRadius: '30px',
    boxShadow: '0 15px 35px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '550px', // E rritur në 550px
  },
  inputGroup: {
    marginBottom: '25px',
  },
  label: {
    display: 'block',
    fontWeight: '600',
    fontSize: '16px',
    color: '#333',
    marginBottom: '12px',
  },
  input: {
    width: '100%',
    padding: 'clamp(12px, 3vw, 18px) clamp(14px, 3.5vw, 20px)',
    borderRadius: '15px',
    border: '1px solid #e0e0e0',
    backgroundColor: '#fafafa',
    boxSizing: 'border-box',
    fontSize: '17px',
  },
  button: {
    width: '100%',
    padding: 'clamp(12px, 3.5vw, 20px)',
    backgroundColor: '#1fbba6',
    color: '#fff',
    border: 'none',
    borderRadius: '15px',
    fontSize: '20px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '20px',
  },
  footer: {
    textAlign: 'center',
    marginTop: '35px',
    fontSize: '17px',
  },
  link: {
    color: '#1fbba6',
    textDecoration: 'none',
    fontWeight: 'bold',
  },
  messageBox: {
    marginTop: '25px',
    padding: '15px 25px',
    borderRadius: '12px',
    fontWeight: 'bold',
    maxWidth: '550px',
    textAlign: 'center',
    width: '100%',
    boxSizing: 'border-box',
    fontSize: '16px'
  }
};

export default ResetPassword;