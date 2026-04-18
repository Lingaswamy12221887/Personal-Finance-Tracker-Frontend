import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getTransactions, saveTransactions } from '../services/userStorage';
import './TransactionForm.css';

const TransactionForm = ({ user, onTransactionAdded }) => {
  const [transaction, setTransaction] = useState({
    type: 'expense',
    amount: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    description: ''
  });

  const [budgets, setBudgets] = useState([]);

  const categories = {
    expense: ['Food', 'Transportation', 'Shopping', 'Entertainment', 'Bills', 'Healthcare', 'Education', 'Other'],
    income: ['Salary', 'Freelance', 'Investment', 'Gift', 'Other']
  };

  useEffect(() => {
    loadBudgets();
  }, [user]);

  const loadBudgets = async () => {
    if (!user?.id) return;
    try {
      const response = await fetch('http://localhost:5000/api/budgets', {
        headers: { 'x-user-id': user.id }
      });
      const data = await response.json();
      if (data.success) setBudgets(data.budgets);
    } catch (error) {
      console.error('Failed to load budgets:', error);
    }
  };

  const checkBudgetLimit = async (category, amount) => {
    const budget = budgets.find(b => b.category === category);
    if (!budget) return null;

    const newSpent = budget.spent + parseFloat(amount);
    const percentage = (newSpent / budget.limit) * 100;

    try {
      const response = await fetch(`http://localhost:5000/api/budgets/${budget.id}/spend`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({ amount: parseFloat(amount) })
      });
      const data = await response.json();

      if (data.exceeded) {
        await sendBudgetAlert({ category, limit: budget.limit, spent: newSpent, percentage });
      }
      return data.exceeded;
    } catch (error) {
      console.error('Failed to update budget:', error);
      return null;
    }
  };

  const sendBudgetAlert = async (budgetData) => {
    try {
      await fetch('http://localhost:5000/api/send-budget-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...budgetData, userEmail: user.email })
      });
    } catch (error) {
      console.error('Failed to send budget alert:', error);
    }
  };

  const sendTransactionNotification = async (transactionData) => {
    try {
      const response = await fetch('http://localhost:5000/api/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...transactionData, userEmail: user.email })
      });
      const data = await response.json();
      if (data.results?.email?.success) toast.success('📧 Email notification sent!');
      if (data.results?.sms?.success) toast.success('📱 SMS notification sent!');
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!transaction.amount || !transaction.category) {
      toast.error('Please fill all required fields');
      return;
    }

    // Load this user's transactions
    const transactions = getTransactions(user);

    const currentBalance = transactions.reduce((acc, t) => {
      return t.type === 'income' ? acc + parseFloat(t.amount) : acc - parseFloat(t.amount);
    }, 0);

    const newBalance = transaction.type === 'income'
      ? currentBalance + parseFloat(transaction.amount)
      : currentBalance - parseFloat(transaction.amount);

    const newTransaction = {
      ...transaction,
      id: Date.now().toString(),
      amount: parseFloat(transaction.amount)
    };

    // Save to this user's key
    saveTransactions(user, [...transactions, newTransaction]);

    // Check budget limit for expenses
    if (transaction.type === 'expense') {
      const budgetExceeded = await checkBudgetLimit(transaction.category, transaction.amount);
      if (budgetExceeded) {
        toast.warning(`⚠️ Budget limit exceeded for ${transaction.category}!`);
      }
    }

    // Send notification
    await sendTransactionNotification({
      type: transaction.type,
      amount: parseFloat(transaction.amount),
      category: transaction.category,
      date: transaction.date,
      balance: newBalance
    });

    // Reset form
    setTransaction({
      type: 'expense', amount: '', category: '',
      date: new Date().toISOString().split('T')[0], description: ''
    });

    toast.success('Transaction added successfully!');
    loadBudgets();

    if (onTransactionAdded) onTransactionAdded(newTransaction);
  };

  return (
    <div className="transaction-form-container">
      <h2>➕ Add Transaction</h2>

      <form onSubmit={handleSubmit} className="transaction-form">
        <div className="form-group">
          <label>Type</label>
          <div className="type-selector">
            <button
              type="button"
              className={`type-btn ${transaction.type === 'expense' ? 'active expense' : ''}`}
              onClick={() => setTransaction({...transaction, type: 'expense', category: ''})}
            >
              💸 Expense
            </button>
            <button
              type="button"
              className={`type-btn ${transaction.type === 'income' ? 'active income' : ''}`}
              onClick={() => setTransaction({...transaction, type: 'income', category: ''})}
            >
              💰 Income
            </button>
          </div>
        </div>

        <div className="form-group">
          <label>Amount (₹) *</label>
          <input
            type="number"
            value={transaction.amount}
            onChange={(e) => setTransaction({...transaction, amount: e.target.value})}
            placeholder="Enter amount"
            required min="0" step="0.01"
          />
        </div>

        <div className="form-group">
          <label>Category *</label>
          <select
            value={transaction.category}
            onChange={(e) => setTransaction({...transaction, category: e.target.value})}
            required
          >
            <option value="">Select Category</option>
            {categories[transaction.type].map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Date *</label>
          <input
            type="date"
            value={transaction.date}
            onChange={(e) => setTransaction({...transaction, date: e.target.value})}
            required
          />
        </div>

        <div className="form-group">
          <label>Description (Optional)</label>
          <textarea
            value={transaction.description}
            onChange={(e) => setTransaction({...transaction, description: e.target.value})}
            placeholder="Add notes..." rows="3"
          />
        </div>

        <button type="submit" className="btn-submit">Add Transaction</button>
      </form>
    </div>
  );
};

export default TransactionForm;