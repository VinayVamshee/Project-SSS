import React, { useState, useEffect } from 'react';
import { getEmployees, getSalaryStructures, saveSalaryStructure, getTemplates, getTemplateForm } from '../../../API';
import DynamicForm from '../../Shared/DynamicForm/DynamicForm';

export default function SalarySubmodule({ showMessage }) {
  const [employees, setEmployees] = useState([]);
  const [salaryStructures, setSalaryStructures] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [templateForm, setTemplateForm] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const empRes = await getEmployees();
      setEmployees((empRes.data.data || []).filter(e => e.status === 'Active'));

      const salRes = await getSalaryStructures();
      setSalaryStructures(salRes.data.data || []);

      const templatesRes = await getTemplates();
      const salTemplate = (templatesRes.data.data || []).find(t => t.purpose === 'salary_structure');
      if (salTemplate) {
        const formRes = await getTemplateForm(salTemplate._id);
        setTemplateForm(formRes.data.data);
      }
    } catch (err) {
      console.error(err);
      showMessage('Failed to load salary structures configuration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (formData) => {
    if (!templateForm || !selectedEmployee) return;
    setLoading(true);
    try {
      const existing = salaryStructures.find(s => (s.employeeId?._id || s.employeeId) === selectedEmployee._id);
      const payload = { ...formData, employeeId: selectedEmployee._id };
      if (existing) {
        payload._id = existing._id;
      }
      await saveSalaryStructure(templateForm.template.id || templateForm.template._id, payload);
      showMessage('Salary structure updated successfully!');
      loadData();
    } catch (err) {
      console.error(err);
      showMessage('Failed to save salary structure: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const flattened = {};
    (emp.dynamicFields || []).forEach(df => {
      const key = df.fieldId?.key;
      if (key) flattened[key.toLowerCase()] = df.value || '';
    });
    const fullName = (flattened.fullname || emp.name || '').toLowerCase();
    const code = (emp.employeeCode || '').toLowerCase();
    return fullName.includes(searchQuery.toLowerCase()) || code.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="hr-split-panel">
      {/* Left Column: Staff Selection */}
      <div className="hr-list-panel">
        <h5 className="fw-bold mb-2"><i className="fa-solid fa-users text-primary me-2"></i>Select Staff</h5>
        <input
          type="text"
          className="hr-search-bar"
          placeholder="Search by name, employee code..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        <div className="d-flex flex-column gap-3 mt-2">
          {filteredEmployees.map(emp => {
            const isSelected = selectedEmployee && selectedEmployee._id === emp._id;
            const flattened = {};
            (emp.dynamicFields || []).forEach(df => {
              const key = df.fieldId?.key;
              if (key) flattened[key] = df.value;
            });
            const hasSal = salaryStructures.some(s => (s.employeeId?._id || s.employeeId) === emp._id);

            return (
              <div
                key={emp._id}
                className={`hr-entity-item ${isSelected ? 'active' : ''}`}
                onClick={() => setSelectedEmployee(emp)}
              >
                <div className="d-flex justify-content-between align-items-center">
                  <span className="fw-bold">{flattened.fullname || 'Unnamed Staff'}</span>
                  {hasSal ? (
                    <span className="badge bg-success-subtle text-success small border border-success-subtle rounded px-2">Configured</span>
                  ) : (
                    <span className="badge bg-warning-subtle text-warning small border border-warning-subtle rounded px-2">Pending</span>
                  )}
                </div>
                <div className="d-flex justify-content-between small text-muted">
                  <span>Code: {emp.employeeCode}</span>
                  <span>{flattened.designation || 'N/A'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Column: Dynamic Form */}
      <div className="hr-form-panel">
        {selectedEmployee ? (
          <>
            <div className="mb-4 bg-light p-3 rounded">
              <h5 className="fw-bold text-dark mb-1">
                Configure Payroll for {(() => {
                  const flattened = {};
                  (selectedEmployee.dynamicFields || []).forEach(df => {
                    const key = df.fieldId?.key;
                    if (key) flattened[key] = df.value;
                  });
                  return flattened.fullname || 'Unnamed Staff';
                })()}
              </h5>
              <p className="text-muted small m-0">Employee Code: {selectedEmployee.employeeCode}</p>
            </div>

            {templateForm ? (
              <DynamicForm
                template={templateForm}
                mode="create"
                values={(() => {
                  const existing = salaryStructures.find(s => (s.employeeId?._id || s.employeeId) === selectedEmployee._id);
                  if (!existing) return {};
                  const flatValues = { ...existing };
                  (existing.dynamicFields || []).forEach(df => {
                    const key = df.fieldId?.key;
                    if (key) flatValues[key] = df.value;
                  });
                  return flatValues;
                })()}
                onSubmit={handleSave}
                submitLabel="Save Compensation Plan"
              />
            ) : (
              <div className="text-center text-muted py-4">
                <i className="fa-solid fa-spinner fa-spin fa-2x mb-2 text-primary"></i>
                <p>Loading payroll structure configuration...</p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center text-muted py-5">
            <i className="fa-solid fa-hand-pointer fa-3x mb-3 text-secondary"></i>
            <h5>Select a staff member from the left panel to configure their salary structure.</h5>
          </div>
        )}
      </div>
    </div>
  );
}
