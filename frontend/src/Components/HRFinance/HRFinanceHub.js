import React, { useState, useEffect } from 'react';
import './CSS/HRFinance.css';
import EmployeeSubmodule from './Submodules/EmployeeSubmodule';
import AttendanceSubmodule from './Submodules/AttendanceSubmodule';
import SalarySubmodule from './Submodules/SalarySubmodule';
import ExpenseSubmodule from './Submodules/ExpenseSubmodule';
import { getEmployees, getExpenses, getSalaryStructures } from '../../API';

export default function HRFinanceHub() {
  const [activeTab, setActiveTab] = useState('employees');
  const [message, setMessage] = useState('');
  const [metrics, setMetrics] = useState({
    totalEmployees: 0,
    teachers: 0,
    activeStructures: 0,
    monthlyExpenses: 0
  });

  const showMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 5000);
  };

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const empRes = await getEmployees();
        const emps = empRes.data.data || [];
        
        const activeStructuresRes = await getSalaryStructures();
        const structs = activeStructuresRes.data.data || [];

        const expRes = await getExpenses();
        const expenses = expRes.data.data || [];

        // Compute monthly expenses sum
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthlySum = expenses.reduce((acc, curr) => {
          const d = new Date(curr.date);
          if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
            return acc + (curr.amount || 0);
          }
          return acc;
        }, 0);

        // Count teaching staff
        const teachingCount = emps.filter(e => {
          const typeField = (e.dynamicFields || []).find(df => df.fieldId?.key === 'employeetype');
          return typeField?.value === 'Teaching';
        }).length;

        setMetrics({
          totalEmployees: emps.filter(e => e.status === 'Active').length,
          teachers: teachingCount,
          activeStructures: structs.filter(s => s.status === 'Active').length,
          monthlyExpenses: monthlySum
        });
      } catch (err) {
        console.error('Failed to load metrics:', err);
      }
    };
    fetchMetrics();
  }, [activeTab]);

  return (
    <div className="hr-finance-container">
      {/* Header Banner */}
      <div className="hr-finance-header d-flex justify-content-between align-items-center">
        <div>
          <h3 className="fw-bold m-0"><i className="fa-solid fa-people-roof text-primary me-2"></i>HR & Finance Module</h3>
          <p className="text-muted small m-0 mt-1">Manage institutional payroll systems, employee directories, attendance registers, and expense ledgers.</p>
        </div>
      </div>

      {/* Notification Toast */}
      {message && (
        <div className="alert alert-info py-2 px-3 shadow-sm rounded border d-flex justify-content-between align-items-center mb-0">
          <span>{message}</span>
          <button className="btn-close" onClick={() => setMessage('')} style={{ border: 'none', background: 'transparent', fontSize: '0.8rem' }}>&times;</button>
        </div>
      )}

      {/* Metric Cards grid */}
      <div className="hr-finance-metrics">
        <div className="hr-metric-card">
          <span className="text-muted small fw-bold uppercase">Active Employees</span>
          <h2 className="fw-bold mt-2 mb-0 text-primary">{metrics.totalEmployees}</h2>
          <span className="small text-success mt-1"><i className="fa-solid fa-circle me-1" style={{ fontSize: '6px' }}></i>Staff Onboarded</span>
        </div>
        <div className="hr-metric-card">
          <span className="text-muted small fw-bold uppercase">Teaching Staff</span>
          <h2 className="fw-bold mt-2 mb-0 text-info">{metrics.teachers}</h2>
          <span className="small text-muted mt-1">Class Instructors</span>
        </div>
        <div className="hr-metric-card">
          <span className="text-muted small fw-bold uppercase">Active Pay structures</span>
          <h2 className="fw-bold mt-2 mb-0 text-warning">{metrics.activeStructures}</h2>
          <span className="small text-muted mt-1">Compensations configured</span>
        </div>
        <div className="hr-metric-card">
          <span className="text-muted small fw-bold uppercase">Monthly Expenses</span>
          <h2 className="fw-bold mt-2 mb-0 text-danger">₹{metrics.monthlyExpenses}</h2>
          <span className="small text-muted mt-1">Current Month Outflow</span>
        </div>
      </div>

      {/* Main layout */}
      <div className="hr-finance-layout">
        {/* Left Sidebar Navigation */}
        <div className="hr-finance-sidebar">
          <button
            className={`hr-finance-nav-btn ${activeTab === 'employees' ? 'active' : ''}`}
            onClick={() => setActiveTab('employees')}
          >
            <i className="fa-solid fa-user-tie"></i>
            Employees
          </button>
          <button
            className={`hr-finance-nav-btn ${activeTab === 'attendance' ? 'active' : ''}`}
            onClick={() => setActiveTab('attendance')}
          >
            <i className="fa-solid fa-calendar-days"></i>
            Attendance
          </button>
          <button
            className={`hr-finance-nav-btn ${activeTab === 'salary' ? 'active' : ''}`}
            onClick={() => setActiveTab('salary')}
          >
            <i className="fa-solid fa-file-invoice-dollar"></i>
            Salary Structures
          </button>
          <button
            className={`hr-finance-nav-btn ${activeTab === 'expenses' ? 'active' : ''}`}
            onClick={() => setActiveTab('expenses')}
          >
            <i className="fa-solid fa-receipt"></i>
            Expenses
          </button>
        </div>

        {/* Right Active View Panel */}
        <div className="hr-finance-active-view">
          {activeTab === 'employees' && <EmployeeSubmodule showMessage={showMessage} />}
          {activeTab === 'attendance' && <AttendanceSubmodule showMessage={showMessage} />}
          {activeTab === 'salary' && <SalarySubmodule showMessage={showMessage} />}
          {activeTab === 'expenses' && <ExpenseSubmodule showMessage={showMessage} />}
        </div>
      </div>
    </div>
  );
}
