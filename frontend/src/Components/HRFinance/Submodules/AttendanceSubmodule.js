import React, { useState, useEffect } from 'react';
import { getEmployees, getEmployeeAttendance, saveEmployeeAttendance } from '../../../API';

export default function AttendanceSubmodule({ showMessage }) {
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState({}); // { employeeId: { status, remarks } }
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const empRes = await getEmployees();
      const activeEmps = (empRes.data.data || []).filter(e => e.status === 'Active');
      setEmployees(activeEmps);

      const attRes = await getEmployeeAttendance(date);
      const attMap = {};
      (attRes.data.data || []).forEach(att => {
        attMap[att.employeeId?._id || att.employeeId] = {
          status: att.status,
          remarks: att.remarks || ''
        };
      });
      setAttendance(attMap);
    } catch (err) {
      console.error(err);
      showMessage('Failed to load attendance registry records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const handleStatusChange = (employeeId, status) => {
    setAttendance(prev => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        status
      }
    }));
  };

  const handleRemarksChange = (employeeId, remarks) => {
    setAttendance(prev => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        remarks
      }
    }));
  };

  const handleBulkMark = (status) => {
    const nextAtt = { ...attendance };
    employees.forEach(emp => {
      nextAtt[emp._id] = {
        ...nextAtt[emp._id],
        status
      };
    });
    setAttendance(nextAtt);
    showMessage(`Marked all employees as ${status}.`);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const records = Object.entries(attendance).map(([employeeId, att]) => ({
        employeeId,
        date,
        status: att.status || 'Present',
        remarks: att.remarks || ''
      }));
      
      await saveEmployeeAttendance(records);
      showMessage('Attendance saved successfully!');
      loadData();
    } catch (err) {
      console.error(err);
      showMessage('Failed to save attendance logs.');
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    if (!filterType) return true;
    const typeField = (emp.dynamicFields || []).find(df => df.fieldId?.key === 'employeetype');
    return typeField?.value === filterType;
  });

  return (
    <div className="hr-attendance-card">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="fw-bold m-0"><i className="fa-solid fa-calendar-check text-primary me-2"></i>Daily Attendance Register</h5>
        <div className="d-flex gap-2">
          <input
            type="date"
            className="form-control form-control-sm"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{ width: '160px' }}
          />
          <select
            className="form-select form-select-sm"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            style={{ width: '180px' }}
          >
            <option value="">All Employee Types</option>
            <option value="Teaching">Teaching</option>
            <option value="Non-Teaching">Non-Teaching</option>
            <option value="Support">Support</option>
          </select>
        </div>
      </div>

      {/* Bulk Operations Toolbar */}
      <div className="d-flex gap-2 mb-4 bg-light p-2 rounded align-items-center">
        <span className="small fw-bold text-muted me-2">Bulk Actions:</span>
        <button className="btn btn-sm btn-success py-1" onClick={() => handleBulkMark('Present')}>Mark All Present</button>
        <button className="btn btn-sm btn-danger py-1" onClick={() => handleBulkMark('Absent')}>Mark All Absent</button>
        <button className="btn btn-sm btn-warning py-1" onClick={() => handleBulkMark('Leave')}>Mark All Leave</button>
      </div>

      <table className="hr-attendance-table">
        <thead>
          <tr>
            <th>Employee Details</th>
            <th>Designation</th>
            <th>Attendance Status</th>
            <th>Remarks / Reason</th>
          </tr>
        </thead>
        <tbody>
          {filteredEmployees.map(emp => {
            const flattened = {};
            (emp.dynamicFields || []).forEach(df => {
              const key = df.fieldId?.key;
              if (key) flattened[key] = df.value;
            });
            const currentRecord = attendance[emp._id] || { status: 'Present', remarks: '' };

            return (
              <tr key={emp._id}>
                <td>
                  <div className="fw-semibold">{flattened.fullname || 'Unnamed Staff'}</div>
                  <div className="small text-muted">{emp.employeeCode}</div>
                </td>
                <td className="small text-muted">{flattened.designation || 'N/A'}</td>
                <td>
                  <div className="btn-group btn-group-sm" role="group">
                    {['Present', 'Absent', 'HalfDay', 'Leave'].map(st => {
                      const isActive = currentRecord.status === st;
                      let btnClass = 'btn-outline-secondary';
                      if (isActive) {
                        if (st === 'Present') btnClass = 'btn-success';
                        else if (st === 'Absent') btnClass = 'btn-danger';
                        else if (st === 'HalfDay') btnClass = 'btn-warning';
                        else if (st === 'Leave') btnClass = 'btn-info text-white';
                      }
                      return (
                        <button
                          key={st}
                          type="button"
                          className={`btn ${btnClass}`}
                          onClick={() => handleStatusChange(emp._id, st)}
                        >
                          {st === 'HalfDay' ? 'Half Day' : st}
                        </button>
                      );
                    })}
                  </div>
                </td>
                <td>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Absent reason, leave types..."
                    value={currentRecord.remarks || ''}
                    onChange={e => handleRemarksChange(emp._id, e.target.value)}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="d-flex justify-content-end gap-2 mt-4">
        <button className="hr-btn-outline" onClick={loadData}>Reset</button>
        <button className="hr-btn-primary" onClick={handleSave} disabled={loading}>
          {loading ? 'Saving Register...' : 'Save Daily Register'}
        </button>
      </div>
    </div>
  );
}
