import React from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token'); // Fshijmë token-in
    navigate('/login'); // Kthehemi te login
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.icon}>👋</div>
        <h1 style={styles.title}>Mirë se vini në Dashboard!</h1>
        <p style={styles.subtitle}>
          Jeni identifikuar me sukses në sistemin SQMS.
        </p>
        
        <button onClick={handleLogout} style={styles.button}>
          Dalje (Logout)
        </button>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f4f7f6',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    padding: '20px',
  },
  card: {
    backgroundColor: '#fff',
    padding: '60px',
    borderRadius: '30px',
    boxShadow: '0 15px 35px rgba(0,0,0,0.1)',
    textAlign: 'center',
    width: '100%',
    maxWidth: '550px',
  },
  icon: {
    fontSize: '50px',
    marginBottom: '20px',
  },
  title: {
    fontSize: '32px',
    color: '#222',
    marginBottom: '10px',
  },
  subtitle: {
    fontSize: '18px',
    color: '#666',
    marginBottom: '40px',
  },
  button: {
    padding: '15px 30px',
    backgroundColor: '#ff5252',
    color: '#fff',
    border: 'none',
    borderRadius: '15px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: '0.3s',
  }
};

export default Dashboard;