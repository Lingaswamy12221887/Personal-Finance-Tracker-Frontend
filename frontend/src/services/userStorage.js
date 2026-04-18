// services/userStorage.js
// All localStorage keys are namespaced by user email so each user has isolated data

export function getUserKey(user, dataKey) {
  const email = (user?.email || 'guest').toLowerCase().replace(/[^a-z0-9@._-]/g, '');
  return `ft_${email}_${dataKey}`;
}

export function getTransactions(user) {
  try {
    const raw = localStorage.getItem(getUserKey(user, 'transactions'));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveTransactions(user, transactions) {
  localStorage.setItem(getUserKey(user, 'transactions'), JSON.stringify(transactions));
}