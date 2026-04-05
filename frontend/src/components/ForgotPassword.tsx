import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const ForgotPassword = () => {
  const [email, setEmail] = useState<string>('');
  const [msg, setMsg] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');

    try {
      const res = await axios.post('http://localhost:5000/api/forgot-password', { email });
      setMsg(res.data.message || "Linku u dërgua me sukses! Kontrollo email-in.");
    } catch (err: any) {
      setMsg(err.response?.data?.error || "Ndodhi një gabim! Sigurohu që email-i është i saktë.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.iconCircle}>🎓</div>
        <h1 style={styles.title}>Rivendos Fjalëkalimin</h1>
        <p style={styles.subtitle}>Shkruaj email-in tënd për të marrë linkun</p>
      </div>

      <div style={styles.card}>
        <form onSubmit={handleResetRequest}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <input 
              type="email" 
              placeholder="emri@email.com" 
              style={styles.input} 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Duke u dërguar..." : "Dërgo Linkun"}
          </button>
        </form>

        <div style={styles.footer}>
          <Link to="/login" style={styles.link}>Kthehu te identifikimi</Link>
        </div>
      </div>

      {msg && (
        <div style={{
          ...styles.messageBox,
          backgroundColor: msg.includes('gabim') || msg.includes('Ndodhi') ? '#ffebee' : '#e8f5e9',
          color: msg.includes('gabim') || msg.includes('Ndodhi') ? '#c62828' : '#2e7d32',
        }}>
          {msg}
        </div>
      )}
    </div>
  );
};

// --- STILIMI I RRITUR (BIG VERSION) ---
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
    maxWidth: '550px', // E rritur në 550px për simetri
  },
  inputGroup: {
    marginBottom: '30px',
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
    backgroundColor: '#fdfdfd',
    boxSizing: 'border-box',
    fontSize: '17px',
  },
  button: {
    width: '100%',
    padding: 'clamp(12px, 3.5vw, 20px)',
    backgroundColor: '#1fbba6',
    color: '#fff',
    border: 'none',
    borderRadius: '18px',
    fontSize: '20px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '10px',
    transition: '0.3s',
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

export default ForgotPassword;