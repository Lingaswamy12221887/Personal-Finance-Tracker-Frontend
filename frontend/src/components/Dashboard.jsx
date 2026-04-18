import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend } from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';
import { getTransactions } from '../services/userStorage';
import './Dashboard.css';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

const Dashboard = ({ user }) => {
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [stats, setStats] = useState({ totalIncome: 0, totalExpense: 0, balance: 0 });

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = () => {
    // Load per-user transactions
    const storedTransactions = getTransactions(user);
    setTransactions(storedTransactions);

    const totalIncome = storedTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const totalExpense = storedTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    setStats({ totalIncome, totalExpense, balance: totalIncome - totalExpense });

    loadBudgets();
  };

  const loadBudgets = async () => {
    if (!user?.id) return;
    try {
      const response = await fetch(`http://localhost:5000/api/budgets`, {
        headers: { 'x-user-id': user.id }
      });
      const data = await response.json();
      if (data.success) setBudgets(data.budgets);
    } catch (error) {
      console.error('Failed to load budgets:', error);
    }
  };

  const getExpenseByCategoryData = () => {
    const expenseTransactions = transactions.filter(t => t.type === 'expense');
    const categoryTotals = {};
    expenseTransactions.forEach(t => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + parseFloat(t.amount);
    });
    return {
      labels: Object.keys(categoryTotals),
      datasets: [{
        label: 'Expenses by Category',
        data: Object.values(categoryTotals),
        backgroundColor: ['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899','#14b8a6','#f97316','#06b6d4','#84cc16'],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    };
  };

  const getIncomeVsExpenseData = () => {
    const last6Months = [];
    const currentDate = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      last6Months.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        income: 0, expense: 0
      });
    }
    transactions.forEach(t => {
      const transactionDate = new Date(t.date);
      const monthIndex = last6Months.findIndex(m => {
        const [month, year] = m.month.split(' ');
        const mDate = new Date(`${month} 1, ${year}`);
        return mDate.getMonth() === transactionDate.getMonth() &&
               mDate.getFullYear() === transactionDate.getFullYear();
      });
      if (monthIndex !== -1) {
        if (t.type === 'income') last6Months[monthIndex].income += parseFloat(t.amount);
        else last6Months[monthIndex].expense += parseFloat(t.amount);
      }
    });
    return {
      labels: last6Months.map(m => m.month),
      datasets: [
        { label: 'Income', data: last6Months.map(m => m.income), backgroundColor: '#10b981', borderColor: '#059669', borderWidth: 2 },
        { label: 'Expense', data: last6Months.map(m => m.expense), backgroundColor: '#ef4444', borderColor: '#dc2626', borderWidth: 2 }
      ]
    };
  };

  const getBalanceTrendData = () => {
    const sortedTransactions = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
    let runningBalance = 0;
    const balanceData = sortedTransactions.map(t => {
      runningBalance += t.type === 'income' ? parseFloat(t.amount) : -parseFloat(t.amount);
      return { date: new Date(t.date).toLocaleDateString('en-IN'), balance: runningBalance };
    });
    return {
      labels: balanceData.map(d => d.date),
      datasets: [{
        label: 'Balance Trend',
        data: balanceData.map(d => d.balance),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.1)',
        borderWidth: 3, fill: true, tension: 0.4, pointRadius: 4, pointHoverRadius: 6
      }]
    };
  };

  const chartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } }
  };

  return (
    <div className="dashboard">
      <h2>📊 Financial Dashboard</h2>

      <div className="stats-cards">
        <div className="stat-card income">
          <div className="stat-icon">💰</div>
          <div className="stat-info">
            <p className="stat-label">Total Income</p>
            <p className="stat-value">₹{stats.totalIncome.toLocaleString('en-IN')}</p>
          </div>
        </div>
        <div className="stat-card expense">
          <div className="stat-icon">💸</div>
          <div className="stat-info">
            <p className="stat-label">Total Expense</p>
            <p className="stat-value">₹{stats.totalExpense.toLocaleString('en-IN')}</p>
          </div>
        </div>
        <div className={`stat-card balance ${stats.balance >= 0 ? 'positive' : 'negative'}`}>
          <div className="stat-icon">💼</div>
          <div className="stat-info">
            <p className="stat-label">Current Balance</p>
            <p className="stat-value">₹{stats.balance.toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>

      {transactions.length > 0 ? (
        <div className="charts-grid">
          <div className="chart-card">
            <h3>Expense by Category</h3>
            <div className="chart-container">
              <Pie data={getExpenseByCategoryData()} options={chartOptions} />
            </div>
          </div>
          <div className="chart-card">
            <h3>Income vs Expense (Last 6 Months)</h3>
            <div className="chart-container">
              <Bar data={getIncomeVsExpenseData()} options={chartOptions} />
            </div>
          </div>
          <div className="chart-card full-width">
            <h3>Balance Trend</h3>
            <div className="chart-container">
              <Line data={getBalanceTrendData()} options={chartOptions} />
            </div>
          </div>
        </div>
      ) : (
        <div className="no-data">
          <p>📊 No transactions yet. Add some transactions to see your financial insights!</p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;