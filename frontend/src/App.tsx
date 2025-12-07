import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast'; // <--- Import this
import LoginPage from './pages/LoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import CashierDashboardPage from './pages/CashierDashboardPage';

function App() {
  return (
    <Router>
      {/* Add Toaster here. 'position' determines where popups appear */}
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/cashier" element={<CashierDashboardPage />} />
      </Routes>
    </Router>
  );
}

export default App;