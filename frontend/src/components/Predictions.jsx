import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getTransactions } from '../services/userStorage';
import './Predictions.css';

const Predictions = ({ user }) => {
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generatePredictions();
  }, [user]);

  const generatePredictions = async () => {
    setLoading(true);

    // Load this user's transactions
    const transactions = getTransactions(user);

    // Load this user's budgets from backend
    let budgets = [];
    if (user?.id) {
      try {
        const response = await fetch('https://personal-finance-tracker-backend-ljou.onrender.com', {
          headers: { 'x-user-id': user.id }
        });
        const data = await response.json();
        if (data.success) budgets = data.budgets;
      } catch (e) {
        console.error('Failed to load budgets for predictions:', e);
      }
    }

    if (transactions.length === 0) {
      setPredictions(null);
      setLoading(false);
      return;
    }

    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

    const recentTransactions = transactions.filter(t =>
      new Date(t.date) >= threeMonthsAgo && t.type === 'expense'
    );

    const categorySpending = {};
    recentTransactions.forEach(t => {
      if (!categorySpending[t.category]) categorySpending[t.category] = [];
      categorySpending[t.category].push(parseFloat(t.amount));
    });

    const categoryPredictions = Object.entries(categorySpending).map(([category, amounts]) => {
      const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const max = Math.max(...amounts);
      const min = Math.min(...amounts);
      const predicted = avg * 1.1;
      const budget = budgets.find(b => b.category === category);

      return {
        category,
        average: avg,
        predicted,
        min, max,
        budget: budget ? budget.limit : null,
        willExceed: budget ? predicted > budget.limit : false,
        exceedAmount: budget && predicted > budget.limit ? predicted - budget.limit : 0
      };
    });

    const totalPredicted = categoryPredictions.reduce((sum, p) => sum + p.predicted, 0);
    const totalBudget = budgets.reduce((sum, b) => sum + b.limit, 0);

    setPredictions({
      categories: categoryPredictions,
      totalPredicted, totalBudget,
      willExceedTotal: totalPredicted > totalBudget,
      monthsAnalyzed: 3,
      transactionsAnalyzed: recentTransactions.length
    });

    setLoading(false);

    categoryPredictions.forEach(p => {
      if (p.willExceed) {
        toast.warning(`🔮 Prediction: ${p.category} may exceed budget by ₹${p.exceedAmount.toFixed(0)} next month!`, { autoClose: 5000 });
      }
    });
  };

  const getSuggestion = (prediction) => {
    if (!prediction.budget) return `💡 Set a budget limit for ${prediction.category} to track spending better.`;
    if (prediction.willExceed) {
      const reduction = prediction.exceedAmount;
      const percentage = (reduction / prediction.predicted) * 100;
      return `⚠️ Reduce ${prediction.category} spending by ₹${reduction.toFixed(0)} (${percentage.toFixed(0)}%) to stay within budget next month.`;
    }
    const remaining = prediction.budget - prediction.predicted;
    return `✅ On track! Predicted spending is ₹${remaining.toFixed(0)} below your ${prediction.category} budget.`;
  };

  if (loading) {
    return (
      <div className="predictions-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Analyzing your spending patterns...</p>
        </div>
      </div>
    );
  }

  if (!predictions) {
    return (
      <div className="predictions-page">
        <div className="empty-predictions">
          <span className="empty-icon">🔮</span>
          <h2>No Data for Predictions</h2>
          <p>Add some transactions to see expense predictions and budget recommendations!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="predictions-page">
      <div className="predictions-header">
        <h1>🔮 Next Month Predictions</h1>
        <p>Based on your last {predictions.monthsAnalyzed} months ({predictions.transactionsAnalyzed} transactions)</p>
      </div>

      <div className={`prediction-summary ${predictions.willExceedTotal ? 'danger' : 'success'}`}>
        <div className="summary-content">
          <div className="summary-icon">{predictions.willExceedTotal ? '⚠️' : '✅'}</div>
          <div className="summary-text">
            <h2>Total Predicted Spending</h2>
            <div className="summary-amount">₹{predictions.totalPredicted.toFixed(2)}</div>
            {predictions.totalBudget > 0 && (
              <p>
                Budget: ₹{predictions.totalBudget.toFixed(2)} •{' '}
                {predictions.willExceedTotal
                  ? <span className="exceed-text"> Over by ₹{(predictions.totalPredicted - predictions.totalBudget).toFixed(2)}</span>
                  : <span className="under-text"> Under by ₹{(predictions.totalBudget - predictions.totalPredicted).toFixed(2)}</span>
                }
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="category-predictions">
        <h2>Category-wise Predictions & Suggestions</h2>
        {predictions.categories.map((pred, index) => (
          <div key={index} className={`prediction-card ${pred.willExceed ? 'will-exceed' : 'on-track'}`}>
            <div className="prediction-header">
              <h3>{pred.category}</h3>
              <div className="prediction-amount">
                <span className="label">Predicted:</span>
                <span className="value">₹{pred.predicted.toFixed(2)}</span>
              </div>
            </div>
            <div className="prediction-stats">
              <div className="stat"><span className="stat-label">Average (3 months):</span><span className="stat-value">₹{pred.average.toFixed(2)}</span></div>
              <div className="stat"><span className="stat-label">Range:</span><span className="stat-value">₹{pred.min.toFixed(0)} - ₹{pred.max.toFixed(0)}</span></div>
              {pred.budget && <div className="stat"><span className="stat-label">Budget Limit:</span><span className="stat-value">₹{pred.budget.toFixed(2)}</span></div>}
            </div>
            {pred.budget && (
              <div className="prediction-progress">
                <div className="progress-bar-container">
                  <div className={`progress-bar ${pred.willExceed ? 'exceed' : 'normal'}`}
                    style={{ width: `${Math.min((pred.predicted / pred.budget) * 100, 100)}%` }} />
                </div>
                <div className="progress-percentage">{((pred.predicted / pred.budget) * 100).toFixed(0)}% of budget</div>
              </div>
            )}
            <div className={`suggestion-box ${pred.willExceed ? 'warning' : 'success'}`}>{getSuggestion(pred)}</div>
          </div>
        ))}
      </div>

      <div className="recommendations-card">
        <h2>💡 Smart Recommendations</h2>
        <ul className="recommendations-list">
          {predictions.categories.filter(p => p.willExceed).length > 0 ? (
            <>
              <li><strong>High Risk:</strong> Focus on reducing spending in {predictions.categories.filter(p => p.willExceed).map(p => p.category).join(', ')}</li>
              <li><strong>Budget Adjustment:</strong> Consider increasing budget limits or reducing expenses</li>
              <li><strong>Track Daily:</strong> Monitor these categories more frequently</li>
            </>
          ) : (
            <>
              <li><strong>Great Job!</strong> You're projected to stay within budget for all categories</li>
              <li><strong>Keep it up:</strong> Maintain your current spending habits</li>
              <li><strong>Consider Saving:</strong> You have room to save ₹{(predictions.totalBudget - predictions.totalPredicted).toFixed(0)} next month</li>
            </>
          )}
          <li><strong>Review Weekly:</strong> Check your progress every week to stay on track</li>
        </ul>
      </div>

      <div className="predictions-actions">
        <button className="btn-refresh" onClick={generatePredictions}>🔄 Refresh Predictions</button>
      </div>
    </div>
  );
};

export default Predictions;
