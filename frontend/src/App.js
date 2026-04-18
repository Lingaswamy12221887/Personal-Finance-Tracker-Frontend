// App.jsx
import React, { useState, useEffect } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import BudgetManager from './components/BudgetManager';
import TransactionForm from './components/TransactionForm';
import Graphs from './components/Graphs';
import Predictions from './components/Predictions';
import ImportTransactions from './components/ImportTransactions';
import ExportData from './components/ExportData';
import './App.css';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (user) setCurrentUser(user);
  }, []);

  useEffect(() => {
    const titles = {
      dashboard:   'Dashboard - Finance Tracker',
      budget:      'Set Budget - Finance Tracker',
      transaction: 'Add Expense - Finance Tracker',
      graphs:      'Graphs - Finance Tracker',
      predictions: 'Predictions - Finance Tracker',
      import:      'Import - Finance Tracker',
      export:      'Export - Finance Tracker',
    };
    document.title = titles[currentPage] || 'Finance Tracker';
  }, [currentPage]);

  const handleLogin = (user) => {
    setCurrentUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    setCurrentPage('dashboard');
  };

  const handleTransactionAdded = () => setRefreshKey(prev => prev + 1);

  const handleImportComplete = () => {
    setRefreshKey(prev => prev + 1);
    setCurrentPage('dashboard');
  };

  const navigateToPage = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':   return <Dashboard key={refreshKey} user={currentUser} />;
      case 'budget':      return <BudgetManager user={currentUser} />;
      case 'transaction': return <TransactionForm user={currentUser} onTransactionAdded={handleTransactionAdded} />;
      case 'graphs':      return <Graphs user={currentUser} />;
      case 'predictions': return <Predictions user={currentUser} />;
      case 'import':      return <ImportTransactions user={currentUser} onImportComplete={handleImportComplete} />;
      case 'export':      return <ExportData user={currentUser} />;
      default:            return <Dashboard key={refreshKey} user={currentUser} />;
    }
  };

  if (!currentUser) {
    return (
      <>
        <Login onLogin={handleLogin} />
        <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick theme="light" />
      </>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="logo" onClick={() => navigateToPage('dashboard')} style={{ cursor: 'pointer' }}>
            <h1>💰 Finance Tracker</h1>
            <p>Welcome, {currentUser.name}!</p>
          </div>
          <div className="header-actions">
            <div className="user-info">
              <span className="user-icon">👤</span>
              <span className="user-name">{currentUser.name}</span>
            </div>
            <button className="btn-logout" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </header>

      <nav className="app-nav">
        <div className="nav-content">
          <button className={`nav-btn ${currentPage === 'dashboard' ? 'active' : ''}`} onClick={() => navigateToPage('dashboard')}>
            <span className="nav-icon">📊</span>
            <span className="nav-text">Dashboard</span>
          </button>
          <button className={`nav-btn ${currentPage === 'budget' ? 'active' : ''}`} onClick={() => navigateToPage('budget')}>
            <span className="nav-icon">💰</span>
            <span className="nav-text">Set Budget</span>
          </button>
          <button className={`nav-btn ${currentPage === 'transaction' ? 'active' : ''}`} onClick={() => navigateToPage('transaction')}>
            <span className="nav-icon">➕</span>
            <span className="nav-text">Add Expense</span>
          </button>
          <button className={`nav-btn ${currentPage === 'graphs' ? 'active' : ''}`} onClick={() => navigateToPage('graphs')}>
            <span className="nav-icon">📈</span>
            <span className="nav-text">Graphs</span>
          </button>
          <button className={`nav-btn ${currentPage === 'predictions' ? 'active' : ''}`} onClick={() => navigateToPage('predictions')}>
            <span className="nav-icon">🔮</span>
            <span className="nav-text">Predictions</span>
          </button>
          <button className={`nav-btn ${currentPage === 'import' ? 'active' : ''}`} onClick={() => navigateToPage('import')}>
            <span className="nav-icon">📥</span>
            <span className="nav-text">Import</span>
          </button>
          <button className={`nav-btn ${currentPage === 'export' ? 'active' : ''}`} onClick={() => navigateToPage('export')}>
            <span className="nav-icon">📤</span>
            <span className="nav-text">Export</span>
          </button>
        </div>
      </nav>

      <main className="app-main">
        {renderPage()}
      </main>

      <footer className="app-footer">
        <div className="footer-content">
          <p>© 2025 Finance Tracker - Budget Management & Expense Tracking</p>
        </div>
      </footer>

      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick theme="light" />
    </div>
  );
}

export default App;