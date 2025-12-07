import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        throw new Error('Invalid credentials');
      }

      const data = await response.json();
      
      // Store session data
      localStorage.setItem('userRole', data.role);
      localStorage.setItem('userName', data.full_name);
      localStorage.setItem('userId', data.user_id); 

      // Artificial delay for UX smoothness
      setTimeout(() => {
          if (data.role === 'Admin') {
            navigate('/admin');
          } else {
            navigate('/cashier');
          }
      }, 800);

    } catch (err) {
      setError('Invalid username or password.');
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Internal CSS for this page specifically */}
      <style>{`
        .login-container {
          display: flex;
          min-height: 100vh;
          width: 100vw;
          background-color: #ffffff;
        }
        .brand-section {
          flex: 1;
          background: linear-gradient(135deg, #4F46E5 0%, #3730a3 100%);
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 60px;
          color: white;
          position: relative;
          overflow: hidden;
        }
        /* Abstract circles background */
        .brand-section::before {
          content: '';
          position: absolute;
          top: -10%;
          right: -10%;
          width: 400px;
          height: 400px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 50%;
        }
        .brand-section::after {
          content: '';
          position: absolute;
          bottom: -10%;
          left: -10%;
          width: 300px;
          height: 300px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 50%;
        }
        .form-section {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
          background-color: #ffffff;
        }
        .login-box {
          width: 100%;
          max-width: 420px;
        }
        .spinner {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        /* Mobile Responsive */
        @media (max-width: 900px) {
          .brand-section { display: none; }
          .form-section { background-color: #f3f4f6; }
          .login-box { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        }
      `}</style>

      {/* LEFT SIDE: Brand & Aesthetic */}
      <div className="brand-section">
        <div style={{ position: 'relative', zIndex: 10 }}>
          <div style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '12px', 
            marginBottom: '40px', background: 'rgba(255,255,255,0.1)', 
            padding: '10px 20px', borderRadius: '30px', backdropFilter: 'blur(10px)' 
          }}>
            <span style={{ fontSize: '1.2rem' }}>💎</span>
            <span style={{ fontWeight: 600, letterSpacing: '1px' }}>SG TECH POS</span>
          </div>
          
          <h1 style={{ fontSize: '3.5rem', fontWeight: 800, lineHeight: 1.1, marginBottom: '20px' }}>
            Manage Sales.<br />
            Track Inventory.<br />
            Simplify Work.
          </h1>
          <p style={{ fontSize: '1.1rem', color: '#c7d2fe', maxWidth: '500px', lineHeight: 1.6 }}>
            The all-in-one solution for retail management. Secure, fast, and reliable point-of-sale system designed for modern businesses.
          </p>
        </div>
      </div>

      {/* RIGHT SIDE: Login Form */}
      <div className="form-section">
        <div className="login-box">
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>Welcome Back</h2>
            <p style={{ color: '#6b7280' }}>Please enter your details to sign in.</p>
          </div>

          {error && (
             <div style={{ 
                backgroundColor: '#fef2f2', 
                color: '#ef4444', 
                padding: '14px', 
                borderRadius: '8px', 
                marginBottom: '24px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px',
                fontSize: '0.9rem',
                border: '1px solid #fee2e2'
             }}>
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
             </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                Username
              </label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. admin"
                className="input-field"
                style={{ height: '50px', backgroundColor: '#f9fafb' }}
                required
              />
            </div>

            <div style={{ marginBottom: '30px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#374151' }}>
                    Password
                </label>
                <span style={{ fontSize: '0.85rem', color: '#4F46E5', cursor: 'pointer' }}>Forgot password?</span>
              </div>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field"
                style={{ height: '50px', backgroundColor: '#f9fafb' }}
                required
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', height: '50px', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                   <svg className="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                     <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                     <path d="M12 2a10 10 0 0 1 10 10" strokeOpacity="1" />
                   </svg>
                   Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div style={{ marginTop: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem' }}>
            © 2025 SG Technologies. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;