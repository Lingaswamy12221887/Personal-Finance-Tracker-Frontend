import React from 'react';

const TransactionList = ({ transactions, onDeleteTransaction }) => {
  if (transactions.length === 0) {
    return (
      <div className="card">
        <h2>Recent Transactions</h2>
        <div className="empty-state">
          <h3>No transactions yet</h3>
          <p>Add your first transaction to get started!</p>
        </div>
      </div>
    );
  }

  const sortedTransactions = [...transactions].sort((a, b) => {
    return new Date(b.date) - new Date(a.date);
  });

  return (
    <div className="card">
      <h2>Recent Transactions</h2>
      <div className="transaction-list">
        {sortedTransactions.map((transaction) => (
          <div key={transaction.id} className="transaction-item">
            <div className="transaction-info">
              <div className="transaction-category">
                {transaction.type === 'income' ? '💰' : '💸'}{' '}
                {transaction.category}
              </div>
              <div className="transaction-date">
                {new Date(transaction.date).toLocaleDateString('en-IN', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
              {transaction.description && (
                <div
                  style={{
                    fontSize: '0.85rem',
                    color: '#6b7280',
                    marginTop: '0.25rem',
                  }}
                >
                  {transaction.description}
                </div>
              )}
            </div>
            <div
              className={`transaction-amount ${transaction.type}`}
            >
              {transaction.type === 'income' ? '+' : '-'}₹
              {transaction.amount.toFixed(2)}
            </div>
            <button
              onClick={() => onDeleteTransaction(transaction.id)}
              className="btn-danger"
            >
              🗑️ Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TransactionList;
