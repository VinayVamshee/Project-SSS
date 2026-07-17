import React, { useState, useEffect } from 'react';
import { getEmployees, saveEmployee, getTemplates, getTemplateForm } from '../../../API';
import DynamicForm from '../../Shared/DynamicForm/DynamicForm';

export default function EmployeeSubmodule({ showMessage }) {
  const [employees, setEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [templateForm, setTemplateForm] = useState(null);
  const [formMode, setFormMode] = useState('create'); // 'create' | 'edit'

  const loadData = async () => {
    try {
      const empRes = await getEmployees();
      setEmployees(empRes.data.data || []);
      
      const templatesRes = await getTemplates();
      const empTemplate = (templatesRes.data.data || []).find(t => t.purpose === 'employee_registration');
      if (empTemplate) {
        const formRes = await getTemplateForm(empTemplate._id);
        setTemplateForm(formRes.data.data);
      }
    } catch (err) {
      console.error(err);
      showMessage('Failed to load employee metadata configuration.');
    }
  };

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (formData) => {
    if (!templateForm) return;
    try {
      const payload = { ...formData };
      if (formMode === 'edit' && selectedEmployee) {
        payload._id = selectedEmployee._id;
      }
      await saveEmployee(templateForm.template.id || templateForm.template._id, payload);
      showMessage(`Employee ${formMode === 'edit' ? 'updated' : 'registered'} successfully!`);
      setSelectedEmployee(null);
      setFormMode('create');
      loadData();
    } catch (err) {
      console.error(err);
      showMessage('Error saving employee profile: ' + (err.response?.data?.message || err.message));
    }
  };

  const filteredEmployees = employees.filter(emp => {
    // Flatten dynamic fields to check name/details
    const flattened = {};
    (emp.dynamicFields || []).forEach(df => {
      const key = df.fieldId?.key || '';
      if (key) flattened[key.toLowerCase()] = df.value || '';
    });

    const fullName = (flattened.fullname || emp.name || '').toLowerCase();
    const code = (emp.employeeCode || '').toLowerCase();
    const designation = (flattened.designation || '').toLowerCase();
    const type = (flattened.employeetype || '').toLowerCase();
    const dept = (flattened.department || '').toLowerCase();

    const matchesSearch = fullName.includes(searchQuery.toLowerCase()) ||
                          code.includes(searchQuery.toLowerCase()) ||
                          designation.includes(searchQuery.toLowerCase()) ||
                          dept.includes(searchQuery.toLowerCase());

    const matchesType = !filterType || type === filterType.toLowerCase();
    const matchesStatus = !filterStatus || emp.status === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  const handleSelectEmployee = (emp) => {
    // Flatten dynamic fields to load into form initial values
    const flatValues = { ...emp };
    (emp.dynamicFields || []).forEach(df => {
      const key = df.fieldId?.key;
      if (key) flatValues[key] = df.value;
    });

    setSelectedEmployee(emp);
    setFormMode('edit');
  };

  return (
    <div className="hr-split-panel">
      {/* Left side: List */}
      <div className="hr-list-panel">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h5 className="fw-bold m-0"><i className="fa-solid fa-users text-primary me-2"></i>Staff Directory</h5>
          <button className="hr-btn-primary py-1 px-2 btn-sm" onClick={() => { setSelectedEmployee(null); setFormMode('create'); }}><i className="fa-solid fa-plus me-1"></i>Add Staff</button>
        </div>

        <input
          type="text"
          className="hr-search-bar"
          placeholder="Search by name, code, department..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />

        <div className="row g-2">
          <div className="col-6">
            <select className="form-select form-select-sm" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">All Types</option>
              <option value="Teaching">Teaching</option>
              <option value="Non-Teaching">Non-Teaching</option>
              <option value="Support">Support</option>
            </select>
          </div>
          <div className="col-6">
            <select className="form-select form-select-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Terminated">Terminated</option>
            </select>
          </div>
        </div>

        <div className="d-flex flex-column gap-3 mt-2">
          {filteredEmployees.map(emp => {
            const flattened = {};
            (emp.dynamicFields || []).forEach(df => {
              const key = df.fieldId?.key;
              if (key) flattened[key] = df.value;
            });
            const isSelected = selectedEmployee && selectedEmployee._id === emp._id;
            return (
              <div
                key={emp._id}
                className={`hr-entity-item ${isSelected ? 'active' : ''}`}
                onClick={() => handleSelectEmployee(emp)}
              >
                <div className="d-flex justify-content-between align-items-center">
                  <span className="fw-bold">{flattened.fullname || 'Unnamed Employee'}</span>
                  <span className={`badge ${emp.status === 'Active' ? 'bg-success' : 'bg-secondary'} rounded-pill`}>{emp.status}</span>
                </div>
                <div className="d-flex justify-content-between small text-muted">
                  <span>Code: {emp.employeeCode}</span>
                  <span>{flattened.employeetype || 'N/A'}</span>
                </div>
                <div className="d-flex justify-content-between small text-muted border-top pt-1 mt-1">
                  <span>Designation: {flattened.designation || 'N/A'}</span>
                  <span>Dept: {flattened.department || 'N/A'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right side: Form */}
      <div className="hr-form-panel">
        <h5 className="fw-bold mb-3 border-bottom pb-2">
          <i className="fa-solid fa-file-invoice text-secondary me-2"></i>
          {formMode === 'edit' ? 'Update Employee Profile' : 'Register New Employee'}
        </h5>
        {templateForm ? (
          <DynamicForm
            template={templateForm}
            mode={formMode}
            values={selectedEmployee ? (() => {
              const flatValues = { ...selectedEmployee };
              (selectedEmployee.dynamicFields || []).forEach(df => {
                const key = df.fieldId?.key;
                if (key) flatValues[key] = df.value;
              });
              return flatValues;
            })() : {}}
            onSubmit={handleSave}
            submitLabel={formMode === 'edit' ? 'Update Staff Member' : 'Register Staff Member'}
          />
        ) : (
          <div className="text-center text-muted py-4">
            <i className="fa-solid fa-spinner fa-spin fa-2x mb-2 text-primary"></i>
            <p>Loading metadata registration template...</p>
          </div>
        )}
      </div>
    </div>
  );
}
