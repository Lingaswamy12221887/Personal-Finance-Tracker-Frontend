import React, { useState } from 'react';
import { toast } from 'react-toastify';

function Login({ onLogin }) {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleRegister = (e) => {
    e.preventDefault();
    setLoading(true);

    const { name, email, password, confirmPassword } = formData;

    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      toast.error('Please fill in all fields');
      setLoading(false);
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      toast.error('Please enter a valid email address');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      setLoading(false);
      return;
    }

    const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    const exists = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      toast.error('An account with this email already exists');
      setLoading(false);
      return;
    }

    const newUser = {
      id: `user_${Date.now()}`,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      createdAt: new Date().toISOString()
    };
    users.push(newUser);
    localStorage.setItem('registeredUsers', JSON.stringify(users));

    toast.success(`Account created! Please log in, ${name.trim()}.`);
    setLoading(false);

    // Switch to login tab — do NOT call onLogin (no auto-login after register)
    setIsRegisterMode(false);
    setFormData({ name: '', email: email.toLowerCase().trim(), password: '', confirmPassword: '' });
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);

    const { email, password } = formData;

    if (!email.trim() || !password) {
      toast.error('Please enter your email and password');
      setLoading(false);
      return;
    }

    const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    const user = users.find(
      u => u.email.toLowerCase() === email.toLowerCase().trim() && u.password === password
    );

    if (!user) {
      toast.error('Invalid email or password');
      setLoading(false);
      return;
    }

    toast.success(`Welcome back, ${user.name}!`);
    setLoading(false);

    // Only here do we call onLogin — takes user to Dashboard
    const { password: _pw, ...safeUser } = user;
    onLogin(safeUser);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logoArea}>
          <div style={styles.logoIcon}>💰</div>
          <h1 style={styles.logoTitle}>Finance Tracker</h1>
          <p style={styles.logoSubtitle}>Personal Budget & Expense Management</p>
        </div>

        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(isRegisterMode ? {} : styles.tabActive) }}
            onClick={() => {
              setIsRegisterMode(false);
              setFormData({ name: '', email: formData.email, password: '', confirmPassword: '' });
            }}
          >
            Login
          </button>
          <button
            style={{ ...styles.tab, ...(isRegisterMode ? styles.tabActive : {}) }}
            onClick={() => {
              setIsRegisterMode(true);
              setFormData({ name: '', email: '', password: '', confirmPassword: '' });
            }}
          >
            Register
          </button>
        </div>

        <form onSubmit={isRegisterMode ? handleRegister : handleLogin} style={styles.form}>
          {isRegisterMode && (
            <div style={styles.field}>
              <label style={styles.label}>Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                style={styles.input}
                autoFocus
              />
            </div>
          )}

          <div style={styles.field}>
            <label style={styles.label}>Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder={isRegisterMode ? 'Minimum 6 characters' : 'Enter your password'}
              style={styles.input}
            />
          </div>

          {isRegisterMode && (
            <div style={styles.field}>
              <label style={styles.label}>Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter your password"
                style={styles.input}
              />
            </div>
          )}

          <button type="submit" style={styles.submitBtn} disabled={loading}>
            {loading ? 'Please wait...' : isRegisterMode ? 'Create Account' : 'Login'}
          </button>
        </form>

        <p style={styles.switchText}>
          {isRegisterMode ? 'Already have an account?' : "Don't have an account?"}{' '}
          <span
            style={styles.switchLink}
            onClick={() => {
              setIsRegisterMode(!isRegisterMode);
              setFormData({ name: '', email: '', password: '', confirmPassword: '' });
            }}
          >
            {isRegisterMode ? 'Login here' : 'Register here'}
          </span>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  },
  card: {
    background: 'white',
    borderRadius: '20px',
    padding: '40px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
  },
  logoArea: {
    textAlign: 'center',
    marginBottom: '28px'
  },
  logoIcon: {
    fontSize: '48px',
    marginBottom: '8px'
  },
  logoTitle: {
    fontSize: '26px',
    fontWeight: '700',
    color: '#1f2937',
    margin: '0 0 4px 0'
  },
  logoSubtitle: {
    fontSize: '13px',
    color: '#6b7280',
    margin: 0
  },
  tabs: {
    display: 'flex',
    background: '#f3f4f6',
    borderRadius: '10px',
    padding: '4px',
    marginBottom: '24px'
  },
  tab: {
    flex: 1,
    padding: '10px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '600',
    color: '#6b7280',
    background: 'transparent',
    transition: 'all 0.2s'
  },
  tabActive: {
    background: '#10b981',
    color: 'white',
    boxShadow: '0 2px 8px rgba(16,185,129,0.3)'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151'
  },
  input: {
    padding: '12px 14px',
    border: '2px solid #e5e7eb',
    borderRadius: '10px',
    fontSize: '15px',
    color: '#1f2937',
    outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: 'inherit'
  },
  submitBtn: {
    padding: '13px',
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer',
    marginTop: '4px',
    transition: 'opacity 0.2s'
  },
  switchText: {
    textAlign: 'center',
    marginTop: '20px',
    fontSize: '14px',
    color: '#6b7280'
  },
  switchLink: {
    color: '#10b981',
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'underline'
  }
};

export default Login;