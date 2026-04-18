import React, { useState, useRef } from 'react';
import { toast } from 'react-toastify';
import { getTransactions, saveTransactions } from '../services/userStorage';

const ImportTransactions = ({ user, onImportComplete }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [preview, setPreview] = useState([]);
  const [rawText, setRawText] = useState('');
  const [fileName, setFileName] = useState('');
  const [step, setStep] = useState('upload'); // upload | preview | done
  const fileInputRef = useRef(null);

  // ── PDF TEXT EXTRACTION ────────────────────────────────────────────────────
  const extractTextFromPDF = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          // Load pdf.js from CDN
          if (!window.pdfjsLib) {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            script.onload = () => {
              window.pdfjsLib.GlobalWorkerOptions.workerSrc =
                'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
              extractWithPdfJs(e.target.result, resolve, reject);
            };
            script.onerror = () => reject(new Error('Failed to load PDF parser'));
            document.head.appendChild(script);
          } else {
            extractWithPdfJs(e.target.result, resolve, reject);
          }
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const extractWithPdfJs = async (arrayBuffer, resolve, reject) => {
    try {
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
      }
      resolve(fullText);
    } catch (err) {
      reject(err);
    }
  };

  // ── TXT EXTRACTION ─────────────────────────────────────────────────────────
  const extractTextFromTxt = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  // ── SMART PARSER ──────────────────────────────────────────────────────────
  // Tries multiple formats:
  // 1. CSV-like:  2024-01-15, Food, 500, expense, Lunch
  // 2. Natural:   15 Jan 2024 - Food - 500 - Lunch
  // 3. Statement: 15/01/2024  FOOD PURCHASE  -500.00
  // 4. Simple:    Food 500  or  500 Food
  const parseTransactions = (text) => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
    const parsed = [];
    const today = new Date().toISOString().split('T')[0];

    const expenseKeywords = ['food','transport','shopping','entertainment','bills','healthcare','education',
      'grocery','groceries','rent','electricity','gas','water','petrol','fuel','uber','ola','zomato',
      'swiggy','amazon','flipkart','medical','medicine','salary','freelance','investment','gift'];

    const categoryMap = {
      food: 'Food', grocery: 'Food', groceries: 'Food', zomato: 'Food', swiggy: 'Food', lunch: 'Food', dinner: 'Food', breakfast: 'Food',
      transport: 'Transportation', transportation: 'Transportation', uber: 'Transportation', ola: 'Transportation',
      petrol: 'Transportation', fuel: 'Transportation', bus: 'Transportation', train: 'Transportation',
      shopping: 'Shopping', amazon: 'Shopping', flipkart: 'Shopping', mall: 'Shopping',
      entertainment: 'Entertainment', movie: 'Entertainment', netflix: 'Entertainment', spotify: 'Entertainment',
      bills: 'Bills', electricity: 'Bills', rent: 'Bills', water: 'Bills', gas: 'Bills', phone: 'Bills', internet: 'Bills',
      healthcare: 'Healthcare', medical: 'Healthcare', medicine: 'Healthcare', hospital: 'Healthcare', doctor: 'Healthcare',
      education: 'Education', school: 'Education', college: 'Education', course: 'Education', book: 'Education',
      salary: 'Salary', freelance: 'Freelance', investment: 'Investment', gift: 'Gift'
    };

    const detectCategory = (text) => {
      const lower = text.toLowerCase();
      for (const [key, cat] of Object.entries(categoryMap)) {
        if (lower.includes(key)) return cat;
      }
      return 'Other';
    };

    const detectType = (text, amount) => {
      const lower = text.toLowerCase();
      if (lower.includes('income') || lower.includes('salary') || lower.includes('credit') ||
          lower.includes('received') || lower.includes('freelance') || lower.includes('investment') ||
          lower.includes('gift') || lower.includes('+')) return 'income';
      if (lower.includes('expense') || lower.includes('debit') || lower.includes('paid') ||
          lower.includes('spent') || lower.includes('-')) return 'expense';
      // Guess by category
      const cat = detectCategory(text);
      if (['Salary','Freelance','Investment','Gift'].includes(cat)) return 'income';
      return 'expense';
    };

    const parseDate = (str) => {
      if (!str) return today;
      // Try various date formats
      const formats = [
        /(\d{4})[/-](\d{1,2})[/-](\d{1,2})/, // 2024-01-15
        /(\d{1,2})[/-](\d{1,2})[/-](\d{4})/, // 15/01/2024 or 15-01-2024
        /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i, // 15 Jan 2024
      ];
      const months = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };

      for (const fmt of formats) {
        const m = str.match(fmt);
        if (m) {
          try {
            let y, mo, d;
            if (fmt === formats[0]) { [,y,mo,d] = m; }
            else if (fmt === formats[1]) { [,d,mo,y] = m; }
            else { [,d,,y] = m; mo = months[m[2].slice(0,3).toLowerCase()]; }
            const date = new Date(parseInt(y), parseInt(mo)-1, parseInt(d));
            if (!isNaN(date)) return date.toISOString().split('T')[0];
          } catch { /* continue */ }
        }
      }
      return today;
    };

    const extractAmount = (str) => {
      // Remove currency symbols, extract number
      const clean = str.replace(/[₹$£€,]/g, '');
      const match = clean.match(/[-+]?\d+(?:\.\d{1,2})?/);
      if (match) return Math.abs(parseFloat(match[0]));
      return null;
    };

    for (const line of lines) {
      // Skip headers and empty-ish lines
      if (/^(date|amount|category|type|description|sl\.?no|s\.?no|#)/i.test(line)) continue;
      if (line.length < 3) continue;

      // Try comma/tab separated (CSV-style)
      const delimiters = [',', '\t', '|', ';'];
      let parsed_line = false;

      for (const delim of delimiters) {
        const parts = line.split(delim).map(p => p.trim()).filter(Boolean);
        if (parts.length >= 2) {
          // Find amount part
          const amountPart = parts.find(p => /\d+/.test(p));
          const amount = amountPart ? extractAmount(amountPart) : null;
          if (!amount || amount <= 0) continue;

          const nonAmountParts = parts.filter(p => extractAmount(p) !== amount || p === amountPart ? false : true);
          const textPart = parts.filter(p => !/^[-+]?\d+(?:[.,]\d+)?$/.test(p.replace(/[₹$£€,]/g,''))).join(' ');

          // Look for date
          const datePart = parts.find(p => /\d{1,4}[/-]\d{1,2}[/-]\d{2,4}/.test(p) ||
            /\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(p));

          parsed.push({
            id: Date.now().toString() + Math.random().toString(36).slice(2),
            date: parseDate(datePart),
            amount,
            category: detectCategory(textPart),
            type: detectType(textPart, amount),
            description: textPart.slice(0, 60) || line.slice(0, 60)
          });
          parsed_line = true;
          break;
        }
      }

      if (!parsed_line) {
        // Try natural language / free-form: extract amount + guess rest
        const amount = extractAmount(line);
        if (amount && amount > 0) {
          parsed.push({
            id: Date.now().toString() + Math.random().toString(36).slice(2),
            date: parseDate(line),
            amount,
            category: detectCategory(line),
            type: detectType(line, amount),
            description: line.slice(0, 60)
          });
        }
      }
    }

    return parsed;
  };

  // ── FILE HANDLER ───────────────────────────────────────────────────────────
  const handleFile = async (file) => {
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['txt', 'pdf', 'csv'].includes(ext)) {
      toast.error('Please upload a .txt, .csv, or .pdf file');
      return;
    }

    setFileName(file.name);
    setParsing(true);
    setStep('upload');

    try {
      let text = '';
      if (ext === 'pdf') {
        text = await extractTextFromPDF(file);
      } else {
        text = await extractTextFromTxt(file);
      }

      setRawText(text);
      const transactions = parseTransactions(text);

      if (transactions.length === 0) {
        toast.warning('No transactions found. Check the format guide below.');
        setParsing(false);
        return;
      }

      setPreview(transactions);
      setStep('preview');
      toast.success(`Found ${transactions.length} transaction(s). Review and confirm.`);
    } catch (err) {
      toast.error('Failed to parse file: ' + err.message);
    } finally {
      setParsing(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleConfirmImport = () => {
    const existing = getTransactions(user);
    const merged = [...existing, ...preview];
    saveTransactions(user, merged);
    toast.success(`✅ ${preview.length} transactions imported successfully!`);
    setStep('done');
    setPreview([]);
    setFileName('');
    if (onImportComplete) onImportComplete();
  };

  const updatePreviewRow = (index, field, value) => {
    const updated = [...preview];
    updated[index] = { ...updated[index], [field]: field === 'amount' ? parseFloat(value) || 0 : value };
    setPreview(updated);
  };

  const removePreviewRow = (index) => {
    setPreview(preview.filter((_, i) => i !== index));
  };

  const resetImport = () => {
    setStep('upload');
    setPreview([]);
    setFileName('');
    setRawText('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const categories = ['Food','Transportation','Shopping','Entertainment','Bills','Healthcare','Education','Salary','Freelance','Investment','Gift','Other'];

  return (
    <div style={s.container}>
      <div style={s.header}>
        <h2 style={s.title}>📥 Import Transactions</h2>
        <p style={s.subtitle}>Upload a .txt, .csv, or .pdf file to bulk-import your expenses</p>
      </div>

      {/* STEP 1: Upload */}
      {step === 'upload' && (
        <>
          <div
            style={{ ...s.dropZone, ...(isDragging ? s.dropZoneActive : {}) }}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.csv,.pdf"
              style={{ display: 'none' }}
              onChange={(e) => handleFile(e.target.files[0])}
            />
            {parsing ? (
              <div style={s.parseState}>
                <div style={s.spinner} />
                <p>Parsing file...</p>
              </div>
            ) : (
              <>
                <div style={s.dropIcon}>📄</div>
                <p style={s.dropTitle}>Drop your file here or click to browse</p>
                <p style={s.dropHint}>Supports .txt, .csv, .pdf</p>
                {fileName && <p style={s.fileName}>📎 {fileName}</p>}
              </>
            )}
          </div>

          {/* Format Guide */}
          <div style={s.formatGuide}>
            <h3 style={s.guideTitle}>📋 Supported Formats</h3>
            <div style={s.formatGrid}>
              <div style={s.formatCard}>
                <strong>CSV / Comma-separated</strong>
                <pre style={s.pre}>{`Date, Category, Amount, Type
2024-01-15, Food, 500, expense
2024-01-16, Salary, 50000, income`}</pre>
              </div>
              <div style={s.formatCard}>
                <strong>Bank Statement Style</strong>
                <pre style={s.pre}>{`15/01/2024  Food Purchase  -500
16/01/2024  Salary Credit  +50000
17/01/2024  Uber Ride      -250`}</pre>
              </div>
              <div style={s.formatCard}>
                <strong>Simple Text</strong>
                <pre style={s.pre}>{`Food 500
Transport 150
Salary 50000
Shopping 2000`}</pre>
              </div>
              <div style={s.formatCard}>
                <strong>Pipe / Tab separated</strong>
                <pre style={s.pre}>{`2024-01-15 | Food | 500 | expense
2024-01-16 | Salary | 50000 | income`}</pre>
              </div>
            </div>
          </div>
        </>
      )}

      {/* STEP 2: Preview & Edit */}
      {step === 'preview' && (
        <div style={s.previewSection}>
          <div style={s.previewHeader}>
            <span style={s.previewCount}>{preview.length} transactions found in <strong>{fileName}</strong></span>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button style={s.btnSecondary} onClick={resetImport}>← Back</button>
              <button style={s.btnPrimary} onClick={handleConfirmImport}>
                ✅ Import {preview.length} Transactions
              </button>
            </div>
          </div>

          <p style={s.previewHint}>Review and edit before importing. Click ✕ to remove any row.</p>

          <div style={s.tableWrapper}>
            <table style={s.table}>
              <thead>
                <tr>
                  {['Date','Type','Category','Amount (₹)','Description',''].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((txn, i) => (
                  <tr key={txn.id} style={{ background: i % 2 === 0 ? '#fafafa' : 'white' }}>
                    <td style={s.td}>
                      <input type="date" value={txn.date} style={s.cellInput}
                        onChange={(e) => updatePreviewRow(i, 'date', e.target.value)} />
                    </td>
                    <td style={s.td}>
                      <select value={txn.type} style={{ ...s.cellInput, color: txn.type === 'income' ? '#10b981' : '#ef4444' }}
                        onChange={(e) => updatePreviewRow(i, 'type', e.target.value)}>
                        <option value="expense">💸 expense</option>
                        <option value="income">💰 income</option>
                      </select>
                    </td>
                    <td style={s.td}>
                      <select value={txn.category} style={s.cellInput}
                        onChange={(e) => updatePreviewRow(i, 'category', e.target.value)}>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                    <td style={s.td}>
                      <input type="number" value={txn.amount} style={{ ...s.cellInput, fontWeight: '700' }}
                        onChange={(e) => updatePreviewRow(i, 'amount', e.target.value)} />
                    </td>
                    <td style={s.td}>
                      <input type="text" value={txn.description} style={s.cellInput}
                        onChange={(e) => updatePreviewRow(i, 'description', e.target.value)} />
                    </td>
                    <td style={{ ...s.td, textAlign: 'center' }}>
                      <button style={s.removeBtn} onClick={() => removePreviewRow(i)}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={s.previewFooter}>
            <button style={s.btnSecondary} onClick={resetImport}>← Upload Different File</button>
            <button style={s.btnPrimary} onClick={handleConfirmImport}>
              ✅ Import {preview.length} Transactions
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Done */}
      {step === 'done' && (
        <div style={s.doneCard}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎉</div>
          <h3 style={{ color: '#1f2937', marginBottom: '8px' }}>Import Complete!</h3>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>Your transactions have been added successfully.</p>
          <button style={s.btnPrimary} onClick={resetImport}>Import Another File</button>
        </div>
      )}
    </div>
  );
};

// ── STYLES ────────────────────────────────────────────────────────────────────
const s = {
  container: { padding: '20px', maxWidth: '1100px', margin: '0 auto', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  header: { marginBottom: '28px' },
  title: { margin: '0 0 6px 0', fontSize: '28px', color: '#1f2937', fontWeight: '700' },
  subtitle: { margin: 0, color: '#6b7280', fontSize: '15px' },

  dropZone: {
    border: '2px dashed #d1d5db', borderRadius: '16px', padding: '60px 20px',
    textAlign: 'center', cursor: 'pointer', background: '#fafafa',
    transition: 'all 0.2s', marginBottom: '28px'
  },
  dropZoneActive: { border: '2px dashed #10b981', background: '#ecfdf5' },
  dropIcon: { fontSize: '56px', marginBottom: '12px' },
  dropTitle: { margin: '0 0 6px 0', fontSize: '18px', fontWeight: '600', color: '#374151' },
  dropHint: { margin: '0 0 8px 0', color: '#9ca3af', fontSize: '14px' },
  fileName: { margin: '8px 0 0 0', color: '#10b981', fontWeight: '600', fontSize: '14px' },

  parseState: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' },
  spinner: {
    width: '40px', height: '40px', border: '4px solid #e5e7eb',
    borderTopColor: '#10b981', borderRadius: '50%',
    animation: 'spin 0.8s linear infinite'
  },

  formatGuide: { background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  guideTitle: { margin: '0 0 16px 0', color: '#1f2937', fontSize: '16px', fontWeight: '600' },
  formatGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' },
  formatCard: { background: '#f9fafb', borderRadius: '8px', padding: '16px', fontSize: '13px', color: '#374151' },
  pre: { margin: '8px 0 0 0', background: '#1f2937', color: '#a3e635', padding: '12px', borderRadius: '6px', fontSize: '12px', overflow: 'auto', lineHeight: '1.6' },

  previewSection: { background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  previewHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '12px' },
  previewCount: { fontSize: '15px', color: '#374151' },
  previewHint: { margin: '0 0 16px 0', color: '#9ca3af', fontSize: '13px' },
  previewFooter: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' },

  tableWrapper: { overflowX: 'auto', borderRadius: '8px', border: '1px solid #e5e7eb' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  th: { padding: '12px 10px', background: '#f3f4f6', color: '#374151', fontWeight: '600', textAlign: 'left', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' },
  td: { padding: '8px 10px', borderBottom: '1px solid #f3f4f6', verticalAlign: 'middle' },
  cellInput: { width: '100%', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', background: 'transparent', outline: 'none', minWidth: '80px' },
  removeBtn: { background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '50%', width: '26px', height: '26px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' },

  btnPrimary: { padding: '11px 24px', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' },
  btnSecondary: { padding: '11px 20px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' },

  doneCard: { background: 'white', borderRadius: '16px', padding: '60px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }
};

// Add spinner keyframe
const styleTag = document.createElement('style');
styleTag.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(styleTag);

export default ImportTransactions;