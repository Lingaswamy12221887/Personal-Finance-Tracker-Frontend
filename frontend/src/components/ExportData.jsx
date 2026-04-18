import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getTransactions } from '../services/userStorage';

const ExportData = ({ user }) => {
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [exportType, setExportType] = useState('both'); // transactions | budgets | both
  const [fileFormat, setFileFormat] = useState('pdf');  // pdf | txt | csv
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    // Load per-user transactions
    const txns = getTransactions(user);
    setTransactions(txns);

    // Load budgets from backend
    if (user?.id) {
      try {
        const res = await fetch('http://localhost:5000/api/budgets', {
          headers: { 'x-user-id': user.id }
        });
        const data = await res.json();
        if (data.success) setBudgets(data.budgets);
      } catch (e) {
        console.error('Could not load budgets:', e);
      }
    }
    setDataLoaded(true);
  };

  // ── STATS HELPERS ──────────────────────────────────────────────────────────
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount), 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount), 0);
  const balance = totalIncome - totalExpense;

  const categoryTotals = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + parseFloat(t.amount); return acc; }, {});

  // ── BUILD TXT CONTENT ──────────────────────────────────────────────────────
  const buildTxtContent = () => {
    const line = '─'.repeat(60);
    const now = new Date().toLocaleString('en-IN');
    let txt = '';

    txt += '╔' + '═'.repeat(58) + '╗\n';
    txt += '║' + '  FINANCE TRACKER — EXPORT REPORT'.padEnd(58) + '║\n';
    txt += '║' + `  User: ${user?.name || ''}`.padEnd(58) + '║\n';
    txt += '║' + `  Generated: ${now}`.padEnd(58) + '║\n';
    txt += '╚' + '═'.repeat(58) + '╝\n\n';

    // Summary
    txt += '📊 SUMMARY\n' + line + '\n';
    txt += `Total Income  : Rs. ${totalIncome.toLocaleString('en-IN')}\n`;
    txt += `Total Expense : Rs. ${totalExpense.toLocaleString('en-IN')}\n`;
    txt += `Balance       : Rs. ${balance.toLocaleString('en-IN')}\n\n`;

    // Transactions
    if (exportType === 'transactions' || exportType === 'both') {
      txt += '💸 TRANSACTIONS (' + transactions.length + ' records)\n' + line + '\n';
      if (transactions.length === 0) {
        txt += 'No transactions found.\n';
      } else {
        txt += 'Date'.padEnd(14) + 'Type'.padEnd(12) + 'Category'.padEnd(18) + 'Amount (Rs.)'.padEnd(16) + 'Description\n';
        txt += '─'.repeat(14) + '─'.repeat(12) + '─'.repeat(18) + '─'.repeat(16) + '─'.repeat(20) + '\n';
        const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
        sorted.forEach(t => {
          const date = new Date(t.date).toLocaleDateString('en-IN');
          const type = t.type.toUpperCase();
          const cat = (t.category || '').slice(0, 16);
          const amt = `${t.type === 'income' ? '+' : '-'}${parseFloat(t.amount).toLocaleString('en-IN')}`;
          const desc = (t.description || '').slice(0, 30);
          txt += date.padEnd(14) + type.padEnd(12) + cat.padEnd(18) + amt.padEnd(16) + desc + '\n';
        });
      }
      txt += '\n';

      // Category breakdown
      if (Object.keys(categoryTotals).length > 0) {
        txt += '📂 EXPENSE BY CATEGORY\n' + line + '\n';
        Object.entries(categoryTotals)
          .sort((a, b) => b[1] - a[1])
          .forEach(([cat, amt]) => {
            const pct = totalExpense > 0 ? ((amt / totalExpense) * 100).toFixed(1) : '0.0';
            txt += `${cat.padEnd(20)} Rs. ${amt.toLocaleString('en-IN').padStart(12)}   (${pct}%)\n`;
          });
        txt += '\n';
      }
    }

    // Budgets
    if (exportType === 'budgets' || exportType === 'both') {
      txt += '💰 BUDGETS (' + budgets.length + ' records)\n' + line + '\n';
      if (budgets.length === 0) {
        txt += 'No budgets set.\n';
      } else {
        txt += 'Category'.padEnd(18) + 'Limit (Rs.)'.padEnd(16) + 'Spent (Rs.)'.padEnd(16) + 'Remaining'.padEnd(16) + 'Used%\n';
        txt += '─'.repeat(18) + '─'.repeat(16) + '─'.repeat(16) + '─'.repeat(16) + '─'.repeat(8) + '\n';
        budgets.forEach(b => {
          const remaining = b.limit - b.spent;
          const pct = b.limit > 0 ? ((b.spent / b.limit) * 100).toFixed(1) : '0.0';
          const status = b.spent > b.limit ? ' !! EXCEEDED' : '';
          txt += b.category.padEnd(18)
            + b.limit.toLocaleString('en-IN').padEnd(16)
            + b.spent.toLocaleString('en-IN').padEnd(16)
            + remaining.toLocaleString('en-IN').padEnd(16)
            + pct + '%' + status + '\n';
        });
      }
      txt += '\n';
    }

    txt += line + '\n';
    txt += 'End of Report — Finance Tracker\n';
    return txt;
  };

  // ── BUILD CSV CONTENT ──────────────────────────────────────────────────────
  const buildCsvContent = () => {
    let csv = '';

    if (exportType === 'transactions' || exportType === 'both') {
      csv += 'TRANSACTIONS\n';
      csv += 'Date,Type,Category,Amount,Description\n';
      const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
      sorted.forEach(t => {
        const desc = (t.description || '').replace(/,/g, ';');
        csv += `${t.date},${t.type},${t.category},${parseFloat(t.amount)},"${desc}"\n`;
      });
      csv += '\n';
    }

    if (exportType === 'budgets' || exportType === 'both') {
      csv += 'BUDGETS\n';
      csv += 'Category,Limit,Spent,Remaining,Period\n';
      budgets.forEach(b => {
        csv += `${b.category},${b.limit},${b.spent},${b.limit - b.spent},${b.period}\n`;
      });
    }

    return csv;
  };

  // ── DOWNLOAD TXT / CSV ─────────────────────────────────────────────────────
  const downloadText = (content, filename, mime) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── GENERATE PDF via jsPDF (CDN) ───────────────────────────────────────────
  const loadJsPDF = () => new Promise((resolve, reject) => {
    if (window.jspdf) { resolve(window.jspdf.jsPDF); return; }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = () => resolve(window.jspdf.jsPDF);
    script.onerror = () => reject(new Error('Failed to load jsPDF'));
    document.head.appendChild(script);
  });

  const downloadPDF = async () => {
    const jsPDF = await loadJsPDF();
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const pageW = 210;
    const margin = 14;
    const colW = pageW - margin * 2;
    let y = 0;

    const checkPage = (needed = 10) => {
      if (y + needed > 275) { doc.addPage(); y = 20; }
    };

    // ── HEADER ──
    doc.setFillColor(102, 126, 234);
    doc.rect(0, 0, pageW, 38, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Finance Tracker — Export Report', margin, 16);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`User: ${user?.name || ''}   |   Generated: ${new Date().toLocaleString('en-IN')}`, margin, 26);
    doc.text(`Email: ${user?.email || ''}`, margin, 32);

    y = 48;
    doc.setTextColor(30, 30, 30);

    // ── SUMMARY BOX ──
    doc.setFillColor(243, 244, 246);
    doc.roundedRect(margin, y, colW, 28, 3, 3, 'F');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary', margin + 4, y + 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(16, 185, 129);
    doc.text(`Total Income:  Rs. ${totalIncome.toLocaleString('en-IN')}`, margin + 4, y + 16);
    doc.setTextColor(239, 68, 68);
    doc.text(`Total Expense: Rs. ${totalExpense.toLocaleString('en-IN')}`, margin + 70, y + 16);
    doc.setTextColor(balance >= 0 ? 16 : 239, balance >= 0 ? 185 : 68, balance >= 0 ? 129 : 68);
    doc.text(`Balance: Rs. ${balance.toLocaleString('en-IN')}`, margin + 4, y + 23);
    y += 36;

    doc.setTextColor(30, 30, 30);

    // ── TRANSACTIONS ──
    if (exportType === 'transactions' || exportType === 'both') {
      checkPage(20);
      doc.setFillColor(102, 126, 234);
      doc.rect(margin, y, colW, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`Transactions  (${transactions.length} records)`, margin + 3, y + 5.5);
      y += 12;
      doc.setTextColor(30, 30, 30);

      if (transactions.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.text('No transactions found.', margin, y + 6);
        y += 12;
      } else {
        // Table header
        const cols = { date: 28, type: 22, category: 36, amount: 28, desc: colW - 114 };
        doc.setFillColor(229, 231, 235);
        doc.rect(margin, y, colW, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        let x = margin + 2;
        doc.text('Date', x, y + 5); x += cols.date;
        doc.text('Type', x, y + 5); x += cols.type;
        doc.text('Category', x, y + 5); x += cols.category;
        doc.text('Amount (Rs.)', x, y + 5); x += cols.amount;
        doc.text('Description', x, y + 5);
        y += 9;

        const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
        sorted.forEach((t, i) => {
          checkPage(8);
          if (i % 2 === 0) {
            doc.setFillColor(249, 250, 251);
            doc.rect(margin, y - 1, colW, 7, 'F');
          }
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          const isIncome = t.type === 'income';
          let x = margin + 2;
          doc.setTextColor(80, 80, 80);
          doc.text(new Date(t.date).toLocaleDateString('en-IN'), x, y + 4); x += cols.date;
          doc.setTextColor(isIncome ? 16 : 239, isIncome ? 185 : 68, isIncome ? 129 : 68);
          doc.text(t.type.toUpperCase(), x, y + 4); x += cols.type;
          doc.setTextColor(80, 80, 80);
          doc.text((t.category || '').slice(0, 18), x, y + 4); x += cols.category;
          doc.setTextColor(isIncome ? 16 : 239, isIncome ? 185 : 68, isIncome ? 129 : 68);
          doc.text(`${isIncome ? '+' : '-'}${parseFloat(t.amount).toLocaleString('en-IN')}`, x, y + 4); x += cols.amount;
          doc.setTextColor(80, 80, 80);
          doc.text((t.description || '').slice(0, 28), x, y + 4);
          y += 7;
        });

        // Category breakdown
        if (Object.keys(categoryTotals).length > 0) {
          y += 6;
          checkPage(16);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(30, 30, 30);
          doc.text('Expense by Category', margin, y);
          y += 6;
          const entries = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
          entries.forEach(([cat, amt]) => {
            checkPage(7);
            const pct = totalExpense > 0 ? (amt / totalExpense) * 100 : 0;
            const barW = (pct / 100) * (colW - 60);
            doc.setFillColor(229, 231, 235);
            doc.rect(margin + 44, y - 3, colW - 60, 5, 'F');
            doc.setFillColor(102, 126, 234);
            doc.rect(margin + 44, y - 3, barW, 5, 'F');
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(50, 50, 50);
            doc.text(cat.slice(0, 18), margin, y + 1);
            doc.text(`Rs. ${amt.toLocaleString('en-IN')}  (${pct.toFixed(1)}%)`, margin + colW - 42, y + 1);
            y += 8;
          });
        }
      }
      y += 8;
    }

    // ── BUDGETS ──
    if (exportType === 'budgets' || exportType === 'both') {
      checkPage(20);
      doc.setFillColor(16, 185, 129);
      doc.rect(margin, y, colW, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`Budgets  (${budgets.length} records)`, margin + 3, y + 5.5);
      y += 12;
      doc.setTextColor(30, 30, 30);

      if (budgets.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.text('No budgets set.', margin, y + 6);
        y += 12;
      } else {
        budgets.forEach((b, i) => {
          checkPage(22);
          const pct = b.limit > 0 ? (b.spent / b.limit) * 100 : 0;
          const exceeded = b.spent > b.limit;
          const barColor = exceeded ? [239, 68, 68] : pct > 80 ? [245, 158, 11] : [16, 185, 129];

          if (i % 2 === 0) {
            doc.setFillColor(249, 250, 251);
            doc.rect(margin, y, colW, 18, 'F');
          }

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9.5);
          doc.setTextColor(30, 30, 30);
          doc.text(b.category, margin + 3, y + 6);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.5);
          doc.setTextColor(80, 80, 80);
          doc.text(`Limit: Rs.${b.limit.toLocaleString('en-IN')}`, margin + 50, y + 6);
          doc.text(`Spent: Rs.${b.spent.toLocaleString('en-IN')}`, margin + 95, y + 6);
          const remaining = b.limit - b.spent;
          doc.setTextColor(...(remaining >= 0 ? [16, 185, 129] : [239, 68, 68]));
          doc.text(`Remaining: Rs.${remaining.toLocaleString('en-IN')}`, margin + 140, y + 6);

          // Progress bar
          doc.setFillColor(229, 231, 235);
          doc.roundedRect(margin + 3, y + 9, colW - 30, 4, 1, 1, 'F');
          doc.setFillColor(...barColor);
          doc.roundedRect(margin + 3, y + 9, Math.min(pct / 100, 1) * (colW - 30), 4, 1, 1, 'F');
          doc.setTextColor(...barColor);
          doc.setFontSize(7.5);
          doc.text(`${pct.toFixed(1)}%${exceeded ? ' EXCEEDED' : ''}`, margin + colW - 24, y + 13);

          y += 20;
        });
      }
    }

    // ── FOOTER ──
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFillColor(243, 244, 246);
      doc.rect(0, 285, pageW, 12, 'F');
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.text('Finance Tracker — Confidential Report', margin, 291);
      doc.text(`Page ${i} of ${pageCount}`, pageW - margin - 20, 291);
    }

    const filename = `finance-export-${user?.name || 'user'}-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
  };

  // ── MAIN EXPORT HANDLER ────────────────────────────────────────────────────
  const handleExport = async () => {
    const hasTransactions = transactions.length > 0;
    const hasBudgets = budgets.length > 0;

    if (exportType === 'transactions' && !hasTransactions) { toast.error('No transactions to export'); return; }
    if (exportType === 'budgets' && !hasBudgets) { toast.error('No budgets to export'); return; }
    if (exportType === 'both' && !hasTransactions && !hasBudgets) { toast.error('No data to export'); return; }

    setLoading(true);
    const name = user?.name?.replace(/\s+/g, '-') || 'user';
    const date = new Date().toISOString().split('T')[0];

    try {
      if (fileFormat === 'pdf') {
        await downloadPDF();
        toast.success('PDF downloaded successfully!');
      } else if (fileFormat === 'txt') {
        downloadText(buildTxtContent(), `finance-export-${name}-${date}.txt`, 'text/plain');
        toast.success('TXT file downloaded!');
      } else if (fileFormat === 'csv') {
        downloadText(buildCsvContent(), `finance-export-${name}-${date}.csv`, 'text/csv');
        toast.success('CSV file downloaded!');
      }
    } catch (err) {
      toast.error('Export failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const totalRecords = (exportType === 'transactions' ? transactions.length
    : exportType === 'budgets' ? budgets.length
    : transactions.length + budgets.length);

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h2 style={s.title}>📤 Export Data</h2>
        <p style={s.subtitle}>Download your transactions and budgets as PDF, TXT, or CSV</p>
      </div>

      {/* Stats */}
      {dataLoaded && (
        <div style={s.statsRow}>
          <div style={s.statBox}>
            <span style={s.statNum}>{transactions.length}</span>
            <span style={s.statLabel}>Transactions</span>
          </div>
          <div style={s.statBox}>
            <span style={s.statNum}>{budgets.length}</span>
            <span style={s.statLabel}>Budgets</span>
          </div>
          <div style={{ ...s.statBox, color: totalIncome >= totalExpense ? '#10b981' : '#ef4444' }}>
            <span style={s.statNum}>Rs.{Math.abs(balance).toLocaleString('en-IN')}</span>
            <span style={s.statLabel}>{balance >= 0 ? 'Balance' : 'Deficit'}</span>
          </div>
        </div>
      )}

      <div style={s.card}>
        {/* What to export */}
        <div style={s.section}>
          <label style={s.sectionLabel}>📋 What to Export</label>
          <div style={s.optionGrid}>
            {[
              { val: 'both', label: '📊 Everything', desc: 'Transactions + Budgets' },
              { val: 'transactions', label: '💸 Transactions', desc: `${transactions.length} records` },
              { val: 'budgets', label: '💰 Budgets', desc: `${budgets.length} records` },
            ].map(opt => (
              <div
                key={opt.val}
                style={{ ...s.optionCard, ...(exportType === opt.val ? s.optionCardActive : {}) }}
                onClick={() => setExportType(opt.val)}
              >
                <div style={s.optionTitle}>{opt.label}</div>
                <div style={s.optionDesc}>{opt.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* File format */}
        <div style={s.section}>
          <label style={s.sectionLabel}>📄 File Format</label>
          <div style={s.optionGrid}>
            {[
              { val: 'pdf', label: '📕 PDF', desc: 'Formatted report with charts & tables' },
              { val: 'txt', label: '📝 TXT', desc: 'Plain text, easy to read anywhere' },
              { val: 'csv', label: '📊 CSV', desc: 'Spreadsheet-compatible, open in Excel' },
            ].map(opt => (
              <div
                key={opt.val}
                style={{ ...s.optionCard, ...(fileFormat === opt.val ? s.optionCardActive : {}) }}
                onClick={() => setFileFormat(opt.val)}
              >
                <div style={s.optionTitle}>{opt.label}</div>
                <div style={s.optionDesc}>{opt.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Preview summary */}
        <div style={s.previewBox}>
          <div style={s.previewRow}>
            <span>📁 File name:</span>
            <code style={s.code}>
              finance-export-{user?.name?.replace(/\s+/g, '-') || 'user'}-{new Date().toISOString().split('T')[0]}.{fileFormat}
            </code>
          </div>
          <div style={s.previewRow}>
            <span>📦 Records:</span>
            <strong>{totalRecords} total records will be exported</strong>
          </div>
          <div style={s.previewRow}>
            <span>👤 User:</span>
            <span>{user?.name} ({user?.email})</span>
          </div>
        </div>

        {/* Export button */}
        <button
          style={{ ...s.exportBtn, ...(loading ? s.exportBtnDisabled : {}) }}
          onClick={handleExport}
          disabled={loading}
        >
          {loading ? '⏳ Generating...' : `⬇️ Download ${fileFormat.toUpperCase()}`}
        </button>
      </div>
    </div>
  );
};

const s = {
  page: { padding: '20px', maxWidth: '860px', margin: '0 auto', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  header: { marginBottom: '24px' },
  title: { margin: '0 0 6px 0', fontSize: '28px', color: '#1f2937', fontWeight: '700' },
  subtitle: { margin: 0, color: '#6b7280', fontSize: '15px' },

  statsRow: { display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' },
  statBox: { flex: 1, minWidth: '140px', background: 'white', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', gap: '4px' },
  statNum: { fontSize: '22px', fontWeight: '700', color: '#1f2937' },
  statLabel: { fontSize: '13px', color: '#6b7280' },

  card: { background: 'white', borderRadius: '16px', padding: '28px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  section: { marginBottom: '24px' },
  sectionLabel: { display: 'block', fontSize: '14px', fontWeight: '700', color: '#374151', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' },

  optionGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' },
  optionCard: { padding: '14px 16px', border: '2px solid #e5e7eb', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s', background: '#f9fafb' },
  optionCardActive: { border: '2px solid #10b981', background: '#ecfdf5', boxShadow: '0 0 0 3px rgba(16,185,129,0.15)' },
  optionTitle: { fontWeight: '700', fontSize: '14px', color: '#1f2937', marginBottom: '3px' },
  optionDesc: { fontSize: '12px', color: '#6b7280' },

  previewBox: { background: '#f9fafb', borderRadius: '10px', padding: '16px 20px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '10px' },
  previewRow: { display: 'flex', gap: '12px', alignItems: 'center', fontSize: '14px', color: '#374151', flexWrap: 'wrap' },
  code: { background: '#1f2937', color: '#a3e635', padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace' },

  exportBtn: { width: '100%', padding: '15px', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '17px', fontWeight: '700', cursor: 'pointer', transition: 'opacity 0.2s' },
  exportBtnDisabled: { opacity: 0.6, cursor: 'not-allowed' },
};

export default ExportData;