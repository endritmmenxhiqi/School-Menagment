import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Register from './components/Register';
import Login from './components/Login';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import StaffDashboard from './components/StaffDashboard';
import DisplayDashboard from './components/DisplayDashboard';

const App: React.FC = () => {
  // Kontrollon nëse ka token në LocalStorage
  const isAuthenticated = () => !!localStorage.getItem('token');

  // Përcakton rrugën se ku duhet të shkojë përdoruesi kur hap "/"
  const getRedirectPath = (): string => {
    if (!isAuthenticated()) return "/login"; // NDRYSHIMI: Shko te Login nëse s'je i loguar

    const role = localStorage.getItem('role');
    
    if (role === 'admin') return "/admin-dashboard";
    if (role === 'staf') return "/staff-dashboard"; // Sigurohu që roli përputhet me backend-in (staf)
    
    return "/dashboard";
  };

  return (
    <Router>
      <Toaster position="top-center" reverseOrder={false} />
      <div style={{ minHeight: '100vh', backgroundColor: '#f4f7f6' }}>
        <Routes>
          {/* Rruga kryesore që bën ridrejtimin inteligjent */}
          <Route path="/" element={<Navigate to={getRedirectPath()} replace />} />
          
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/display" element={<DisplayDashboard />} />

          {/* Mbrojtja e Rrugëve (Protected Routes) */}
          <Route 
            path="/dashboard" 
            element={isAuthenticated() ? <Dashboard /> : <Navigate to="/login" />} 
          />
          
          <Route 
            path="/admin-dashboard" 
            element={isAuthenticated() ? <AdminDashboard /> : <Navigate to="/login" />} 
          />

          <Route 
            path="/staff-dashboard" 
            element={isAuthenticated() ? <StaffDashboard /> : <Navigate to="/login" />} 
          />

          {/* Nëse shkruhet një URL e gabuar, kthehu në fillim */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;