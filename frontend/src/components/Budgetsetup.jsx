// BudgetSetup.jsx - Initial monthly budget setup after login
import React, { useState } from 'react';
import './BudgetSetup.css';
import { toast } from 'react-toastify';

const BudgetSetup = ({ user, onBudgetSetup }) => {
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [categories, setCategories] = useState([
    { name: 'Food', limit: '', icon: '🍔' },
    { name: 'Transportation', limit: '', icon: '🚗' },
    { name: 'Shopping', limit: '', icon: '🛍️' },
    { name: 'Entertainment', limit: '', icon: '🎬' },
    { name: 'Bills', limit: '', icon: '📄' },
    { name: 'Healthcare', limit: '', icon: '🏥' },
    { name: 'Education', limit: '', icon: '📚' },
    { name: 'Other', limit: '', icon: '💼' }
  ]);

  const handleCategoryChange = (index, value) => {
    const newCategories = [...categories];
    newCategories[index].limit = value;
    setCategories(newCategories);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!monthlyBudget) {
      toast.error('Please enter your monthly budget!');
      return;
    }

    const totalCategoryBudget = categories.reduce((sum, cat) => {
      return sum + (parseFloat(cat.limit) || 0);
    }, 0);

    if (totalCategoryBudget > parseFloat(monthlyBudget)) {
      toast.warning(`Category budgets (₹${totalCategoryBudget}) exceed monthly budget (₹${monthlyBudget})!`);
    }

    // Save budgets to backend
    const budgetsToSave = categories
      .filter(cat => cat.limit && parseFloat(cat.limit) > 0)
      .map(cat => ({
        category: cat.name,
        limit: parseFloat(cat.limit),
        period: 'monthly',
        spent: 0
      }));

    try {
      // Save each budget to backend
      for (const budget of budgetsToSave) {
        await fetch('http://localhost:5000/api/budgets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(budget)
        });
      }

      // Save monthly budget to user data
      const userData = {
        ...user,
        monthlyBudget: parseFloat(monthlyBudget),
        budgetSetupComplete: true,
        setupDate: new Date().toISOString()
      };

      // Update current user
      localStorage.setItem('currentUser', JSON.stringify(userData));

      // Update in users array
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const userIndex = users.findIndex(u => u.id === user.id);
      if (userIndex !== -1) {
        users[userIndex] = userData;
        localStorage.setItem('users', JSON.stringify(users));
      }

      toast.success('Budget setup complete! 🎉');
      onBudgetSetup(userData);
    } catch (error) {
      console.error('Failed to save budgets:', error);
      toast.error('Failed to save budgets. Please try again.');
    }
  };

  const autoDistribute = () => {
    if (!monthlyBudget) {
      toast.error('Please enter monthly budget first!');
      return;
    }

    const filledCategories = categories.filter(cat => cat.limit && parseFloat(cat.limit) > 0);
    
    if (filledCategories.length === 0) {
      // Distribute equally among all categories
      const perCategory = (parseFloat(monthlyBudget) / categories.length).toFixed(2);
      const newCategories = categories.map(cat => ({
        ...cat,
        limit: perCategory
      }));
      setCategories(newCategories);
      toast.success('Budget distributed equally!');
    } else {
      // Distribute remaining among empty categories
      const totalAllocated = filledCategories.reduce((sum, cat) => sum + parseFloat(cat.limit), 0);
      const remaining = parseFloat(monthlyBudget) - totalAllocated;
      const emptyCategories = categories.filter(cat => !cat.limit || parseFloat(cat.limit) === 0);
      
      if (remaining <= 0) {
        toast.warning('All budget already allocated!');
        return;
      }

      const perCategory = (remaining / emptyCategories.length).toFixed(2);
      const newCategories = categories.map(cat => {
        if (!cat.limit || parseFloat(cat.limit) === 0) {
          return { ...cat, limit: perCategory };
        }
        return cat;
      });
      setCategories(newCategories);
      toast.success('Remaining budget distributed!');
    }
  };

  const getTotalAllocated = () => {
    return categories.reduce((sum, cat) => sum + (parseFloat(cat.limit) || 0), 0);
  };

  const getRemaining = () => {
    return parseFloat(monthlyBudget || 0) - getTotalAllocated();
  };

  return (
    <div className="budget-setup-page">
      <div className="setup-container">
        <div className="setup-header">
          <h1>💰 Welcome, {user.name}!</h1>
          <p>Let's set up your monthly budget to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="setup-form">
          <div className="total-budget-section">
            <label>Your Monthly Budget</label>
            <div className="budget-input-wrapper">
              <span className="currency">₹</span>
              <input
                type="number"
                value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(e.target.value)}
                placeholder="Enter your total monthly budget"
                required
                min="0"
                step="100"
              />
            </div>
            <p className="helper-text">Total amount you plan to spend this month</p>
          </div>

          <div className="divider">
            <span>Allocate to Categories</span>
            <button 
              type="button" 
              className="btn-auto-distribute"
              onClick={autoDistribute}
            >
              Auto Distribute
            </button>
          </div>

          <div className="categories-grid">
            {categories.map((category, index) => (
              <div key={category.name} className="category-input">
                <div className="category-header">
                  <span className="category-icon">{category.icon}</span>
                  <span className="category-name">{category.name}</span>
                </div>
                <div className="category-amount">
                  <span className="currency-small">₹</span>
                  <input
                    type="number"
                    value={category.limit}
                    onChange={(e) => handleCategoryChange(index, e.target.value)}
                    placeholder="0"
                    min="0"
                    step="100"
                  />
                </div>
              </div>
            ))}
          </div>

          {monthlyBudget && (
            <div className="budget-summary">
              <div className="summary-row">
                <span>Total Monthly Budget:</span>
                <span className="amount">₹{parseFloat(monthlyBudget).toLocaleString('en-IN')}</span>
              </div>
              <div className="summary-row">
                <span>Total Allocated:</span>
                <span className="amount allocated">₹{getTotalAllocated().toLocaleString('en-IN')}</span>
              </div>
              <div className={`summary-row ${getRemaining() < 0 ? 'negative' : 'positive'}`}>
                <span>Remaining:</span>
                <span className="amount">₹{getRemaining().toLocaleString('en-IN')}</span>
              </div>
            </div>
          )}

          <button type="submit" className="btn-complete-setup">
            Complete Setup & Start Tracking
          </button>

          <p className="skip-text">
            You can always update your budget later from the Budget Manager
          </p>
        </form>
      </div>
    </div>
  );
};

export default BudgetSetup;