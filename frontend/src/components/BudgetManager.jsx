import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import './BudgetManager.css';

const BudgetManager = ({ user, onDataChange }) => {
  const [budgets, setBudgets] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [newBudget, setNewBudget] = useState({ category: '', limit: '', period: 'monthly' });

  const categories = [
    { name: 'Food', icon: '🍔' },
    { name: 'Transportation', icon: '🚗' },
    { name: 'Shopping', icon: '🛍️' },
    { name: 'Entertainment', icon: '🎬' },
    { name: 'Bills', icon: '📄' },
    { name: 'Healthcare', icon: '🏥' },
    { name: 'Education', icon: '📚' },
    { name: 'Other', icon: '💼' }
  ];

  // Helper: always include userId header
  const userHeaders = () => ({
    'Content-Type': 'application/json',
    'x-user-id': user?.id || 'guest'
  });

  useEffect(() => {
    loadBudgets();
  }, [user]);

  const loadBudgets = async () => {
    if (!user?.id) return;
    try {
      const response = await fetch('https://personal-finance-tracker-backend-ljou.onrender.com', {
        headers: { 'x-user-id': user.id }
      });
      const data = await response.json();
      if (data.success) setBudgets(data.budgets);
    } catch (error) {
      console.error('Failed to load budgets:', error);
    }
  };

  const handleAddBudget = async (e) => {
    e.preventDefault();
    if (!newBudget.category || !newBudget.limit) { toast.error('Please fill all fields'); return; }

    const existingBudget = budgets.find(b => b.category === newBudget.category);
    if (existingBudget) { toast.error(`Budget for ${newBudget.category} already exists!`); return; }

    try {
      const response = await fetch('http://localhost:5000/api/budgets', {
        method: 'POST',
        headers: userHeaders(),
        body: JSON.stringify(newBudget)
      });
      const data = await response.json();
      if (data.success) {
        setBudgets([...budgets, data.budget]);
        setNewBudget({ category: '', limit: '', period: 'monthly' });
        setShowForm(false);
        toast.success('Budget added successfully! 💰');
        if (onDataChange) onDataChange();
      }
    } catch (error) { toast.error('Failed to add budget'); }
  };

  const handleDeleteBudget = async (id) => {
    if (!window.confirm('Are you sure you want to delete this budget?')) return;
    try {
      const response = await fetch(`http://localhost:5000/api/budgets/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': user?.id || 'guest' }
      });
      const data = await response.json();
      if (data.success) {
        setBudgets(budgets.filter(b => b.id !== id));
        toast.success('Budget deleted successfully');
        if (onDataChange) onDataChange();
      }
    } catch (error) { toast.error('Failed to delete budget'); }
  };

  const handleResetBudgets = async () => {
    if (!window.confirm('Reset all budgets spending to zero?')) return;
    try {
      const response = await fetch('http://localhost:5000/api/budgets/reset', {
        method: 'POST',
        headers: userHeaders()
      });
      const data = await response.json();
      if (data.success) {
        setBudgets(data.budgets);
        toast.success('All budgets reset! 🔄');
        if (onDataChange) onDataChange();
      }
    } catch (error) { toast.error('Failed to reset budgets'); }
  };

  const getProgressColor = (spent, limit) => {
    const pct = (spent / limit) * 100;
    if (pct >= 100) return '#ef4444';
    if (pct >= 80) return '#f59e0b';
    if (pct >= 60) return '#eab308';
    return '#10b981';
  };

  const getAvailableBudgets = () => {
    const usedCategories = budgets.map(b => b.category);
    return categories.filter(cat => !usedCategories.includes(cat.name));
  };

  const getTotalBudget = () => budgets.reduce((sum, b) => sum + b.limit, 0);
  const getTotalSpent = () => budgets.reduce((sum, b) => sum + b.spent, 0);

  return (
    <div className="budget-manager">
      <div className="budget-header">
        <div className="header-left">
          <h2>💰 Budget Management</h2>
        </div>
        <div className="header-actions">
          {budgets.length > 0 && (
            <button className="btn-reset-budgets" onClick={handleResetBudgets}>🔄 Reset All</button>
          )}
          <button className="btn-add-budget" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ Add Budget'}
          </button>
        </div>
      </div>

      {budgets.length > 0 && (
        <div className="budget-summary-cards">
          <div className="summary-card">
            <div className="summary-icon">💰</div>
            <div className="summary-info">
              <p className="summary-label">Total Budget</p>
              <p className="summary-value">₹{getTotalBudget().toLocaleString('en-IN')}</p>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon">💸</div>
            <div className="summary-info">
              <p className="summary-label">Total Spent</p>
              <p className="summary-value spent">₹{getTotalSpent().toLocaleString('en-IN')}</p>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon">💼</div>
            <div className="summary-info">
              <p className="summary-label">Remaining</p>
              <p className={`summary-value ${getTotalBudget() - getTotalSpent() >= 0 ? 'positive' : 'negative'}`}>
                ₹{(getTotalBudget() - getTotalSpent()).toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <form className="budget-form" onSubmit={handleAddBudget}>
          <div className="form-group">
            <label>Category</label>
            <select value={newBudget.category} onChange={(e) => setNewBudget({...newBudget, category: e.target.value})} required>
              <option value="">Select Category</option>
              {getAvailableBudgets().map(cat => (
                <option key={cat.name} value={cat.name}>{cat.icon} {cat.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Budget Limit (₹)</label>
            <input type="number" value={newBudget.limit}
              onChange={(e) => setNewBudget({...newBudget, limit: e.target.value})}
              placeholder="Enter amount" required min="0" step="100" />
          </div>
          <div className="form-group">
            <label>Period</label>
            <select value={newBudget.period} onChange={(e) => setNewBudget({...newBudget, period: e.target.value})}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <button type="submit" className="btn-submit" disabled={getAvailableBudgets().length === 0}>Add Budget</button>
        </form>
      )}

      <div className="budgets-list">
        {budgets.length === 0 ? (
          <div className="no-budgets">
            <div className="no-budgets-icon">💰</div>
            <h3>No budgets set yet</h3>
            <p>Click "Add Budget" to create your first budget!</p>
          </div>
        ) : (
          budgets.map(budget => {
            const categoryInfo = categories.find(c => c.name === budget.category);
            const pct = Math.min((budget.spent / budget.limit) * 100, 100);
            return (
              <div key={budget.id} className="budget-card">
                <div className="budget-card-header">
                  <div className="category-title">
                    <span className="category-icon-large">{categoryInfo?.icon || '💼'}</span>
                    <h3>{budget.category}</h3>
                  </div>
                  <button className="btn-delete" onClick={() => handleDeleteBudget(budget.id)} title="Delete budget">×</button>
                </div>
                <div className="budget-info">
                  <div className="budget-amounts">
                    <div className="amount-box spent-box">
                      <span className="label">Spent</span>
                      <span className="amount spent">₹{budget.spent.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="amount-box limit-box">
                      <span className="label">Limit</span>
                      <span className="amount limit">₹{budget.limit.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                  <div className="progress-section">
                    <div className="progress-bar-container">
                      <div className="progress-bar" style={{ width: `${pct}%`, backgroundColor: getProgressColor(budget.spent, budget.limit) }} />
                    </div>
                    <div className="progress-info">
                      <span className="percentage" style={{ color: getProgressColor(budget.spent, budget.limit) }}>
                        {((budget.spent / budget.limit) * 100).toFixed(1)}% used
                      </span>
                      <span className="remaining">₹{(budget.limit - budget.spent).toLocaleString('en-IN')} left</span>
                    </div>
                  </div>
                  <div className="budget-footer">
                    <span className="period-badge">{budget.period}</span>
                    {budget.spent > budget.limit && (
                      <span className="exceeded-badge">⚠️ Exceeded by ₹{(budget.spent - budget.limit).toLocaleString('en-IN')}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default BudgetManager;
