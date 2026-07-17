import React, { useState, useEffect } from 'react';
import { getExpenses, saveExpense, getTemplates, getTemplateForm } from '../../../API';
import DynamicForm from '../../Shared/DynamicForm/DynamicForm';

export default function ExpenseSubmodule({ showMessage }) {
  const [expenses, setExpenses] = useState([]);
  const [templateForm, setTemplateForm] = useState(null);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [formMode, setFormMode] = useState('create'); // 'create' | 'view'
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    try {
      const expRes = await getExpenses();
      setExpenses(expRes.data.data || []);

      const templatesRes = await getTemplates();
      const expenseTemplate = (templatesRes.data.data || []).find(t => t.purpose === 'expense_entry');
      if (expenseTemplate) {
        const formRes = await getTemplateForm(expenseTemplate._id);
        setTemplateForm(formRes.data.data);
      }
    } catch (err) {
      console.error(err);
      showMessage('Failed to load expenses configuration.');
    }
  };

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (formData) => {
    if (!templateForm) return;
    try {
      // Validate or construct expense details
      const payload = { ...formData };
      
      // core fields extraction
      payload.amount = parseFloat(formData.amount || formData.Amount || 0);
      payload.date = formData.date || formData.Date || new Date().toISOString();

      await saveExpense(templateForm.template.id || templateForm.template._id, payload);
      showMessage('Expense logged successfully!');
      setSelectedExpense(null);
      setFormMode('create');
      loadData();
    } catch (err) {
      console.error(err);
      showMessage('Failed to save expense entry: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleSelectExpense = (exp) => {
    // Flatten dynamic fields for read-only view
    const flatValues = { ...exp };
    (exp.dynamicFields || []).forEach(df => {
      const key = df.fieldId?.key;
      if (key) flatValues[key] = df.value;
    });

    setSelectedExpense(flatValues);
    setFormMode('view');
  };

  const filteredExpenses = expenses.filter(exp => {
    const flattened = {};
    (exp.dynamicFields || []).forEach(df => {
      const key = df.fieldId?.key;
      if (key) flattened[key.toLowerCase()] = df.value || '';
    });

    const category = (flattened.expensecategory || '').toLowerCase();
    const vendor = (flattened.vendor || '').toLowerCase();
    const method = (flattened.paymentmethod || '').toLowerCase();
    const invoice = (flattened.invoicenumber || '').toLowerCase();

    return category.includes(searchQuery.toLowerCase()) ||
           vendor.includes(searchQuery.toLowerCase()) ||
           method.includes(searchQuery.toLowerCase()) ||
           invoice.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="hr-split-panel">
      {/* Left Column: Ledger History */}
      <div className="hr-list-panel" style={{ width: '450px' }}>
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h5 className="fw-bold m-0"><i className="fa-solid fa-list-check text-primary me-2"></i>Expense Ledger</h5>
          <button className="hr-btn-primary py-1 px-2 btn-sm" onClick={() => { setSelectedExpense(null); setFormMode('create'); }}><i className="fa-solid fa-plus me-1"></i>New Entry</button>
        </div>

        <input
          type="text"
          className="hr-search-bar"
          placeholder="Search by vendor, invoice, category..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />

        <div className="d-flex flex-column gap-3 mt-2">
          {filteredExpenses.map(exp => {
            const flattened = {};
            (exp.dynamicFields || []).forEach(df => {
              const key = df.fieldId?.key;
              if (key) flattened[key] = df.value;
            });
            const isSelected = selectedExpense && selectedExpense._id === exp._id;
            return (
              <div
                key={exp._id}
                className={`hr-entity-item ${isSelected ? 'active' : ''}`}
                onClick={() => handleSelectExpense(exp)}
              >
                <div className="d-flex justify-content-between align-items-center">
                  <span className="fw-bold">{flattened.expensecategory || 'N/A'}</span>
                  <span className="fw-bold text-danger">₹{exp.amount}</span>
                </div>
                <div className="d-flex justify-content-between small text-muted">
                  <span>Vendor: {flattened.vendor || 'N/A'}</span>
                  <span>{new Date(exp.date).toLocaleDateString()}</span>
                </div>
                <div className="d-flex justify-content-between small text-muted border-top pt-1 mt-1">
                  <span>Invoice: {flattened.invoicenumber || 'N/A'}</span>
                  <span>{flattened.paymentmethod || 'N/A'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Column: Dynamic Form */}
      <div className="hr-form-panel">
        <h5 className="fw-bold mb-3 border-bottom pb-2">
          <i className="fa-solid fa-file-invoice-dollar text-secondary me-2"></i>
          {formMode === 'view' ? 'Expense Record Details' : 'New Expense Entry'}
        </h5>

        {templateForm ? (
          <DynamicForm
            template={templateForm}
            mode={formMode}
            values={formMode === 'view' ? selectedExpense : {}}
            onSubmit={handleSave}
            submitLabel="Post Expense Voucher"
          />
        ) : (
          <div className="text-center text-muted py-4">
            <i className="fa-solid fa-spinner fa-spin fa-2x mb-2 text-primary"></i>
            <p>Loading expense entry template...</p>
          </div>
        )}
      </div>
    </div>
  );
}
