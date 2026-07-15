import React, { useState } from 'react';
import ClassesManager from './ClassesManager';
import SubjectsManager from './SubjectsManager';
import SubjectLinker from './SubjectLinker';
import ChaptersSplitter from './ChaptersSplitter';
import AssessmentWizard from './AssessmentWizard';
import ReportsCenter from './ReportsCenter';
import './CSS/AcademicManagement.css';

export default function AcademicManagementHub() {
  const [selectedModule, setSelectedModule] = useState(null);

  // Render Module Component
  const renderActiveModule = () => {
    switch (selectedModule) {
      case 'classes':
        return <ClassesManager back={() => setSelectedModule(null)} />;
      case 'subjects':
        return <SubjectsManager back={() => setSelectedModule(null)} />;
      case 'subjectMapping':
        return <SubjectLinker back={() => setSelectedModule(null)} />;
      case 'chapters':
        return <ChaptersSplitter back={() => setSelectedModule(null)} />;
      case 'assessments':
        return <AssessmentWizard back={() => setSelectedModule(null)} />;
      case 'reports':
        return <ReportsCenter back={() => setSelectedModule(null)} />;
      default:
        return null;
    }
  };

  if (selectedModule) {
    return (
      <div className="erp-module-wrapper ov-animate-fade">
        <button className="btn btn-outline-secondary mb-3 px-3 py-2 fw-semibold d-inline-flex align-items-center gap-2" onClick={() => setSelectedModule(null)}>
          <i className="fa-solid fa-arrow-left"></i> Back to ERP Dashboard
        </button>
        {renderActiveModule()}
      </div>
    );
  }

  return (
    <div className="erp-dashboard-container ov-animate-fade">
      <div className="erp-welcome-banner mb-4 p-4 rounded text-white" style={{ background: 'linear-gradient(135deg, var(--button-color) 0%, var(--button-hover) 100%)' }}>
        <h4 className="fw-bold m-0"><i className="fa-solid fa-graduation-cap me-2"></i>Academic ERP Workspace</h4>
        <p className="small m-0 opacity-90 mt-1">Configure academic structures, syllabus hierarchies, examination controls, and daily operations registries.</p>
      </div>

      {/* Group 1: Academic Structure */}
      <h5 className="fw-bold mb-3 section-heading"><i className="fa-solid fa-network-wired me-2"></i>Academic Structure</h5>
      <div className="row g-3 mb-4">
        {[
          { key: 'classes', name: 'Classes Registry', icon: 'fa-school', desc: 'Define class levels, sections and students capacity.' },
          { key: 'sections', name: 'Sections Setup', icon: 'fa-cubes', desc: 'Manage section allocations and classroom divisions.', disabled: true },
          { key: 'streams', name: 'Streams Mapping', icon: 'fa-code-fork', desc: 'Map specialization branches (Science, Commerce).', disabled: true },
          { key: 'sessions', name: 'Academic Years', icon: 'fa-calendar-check', desc: 'Configure yearly term limits and active sessions.', disabled: true }
        ].map(item => (
          <div className="col-md-6 col-lg-3" key={item.key}>
            <div 
              className={`erp-launcher-card ${item.disabled ? 'disabled-card' : ''}`}
              onClick={() => !item.disabled && setSelectedModule(item.key)}
            >
              <div className="launcher-icon-box">
                <i className={`fa-solid ${item.icon}`}></i>
              </div>
              <h6 className="fw-bold mt-2 mb-1">{item.name}</h6>
              <p className="small text-muted m-0">{item.desc}</p>
              {item.disabled && <span className="badge badge-soon">Coming Soon</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Group 2: Curriculum Center */}
      <h5 className="fw-bold mb-3 section-heading"><i className="fa-solid fa-book-bookmark me-2"></i>Curriculum & Syllabus</h5>
      <div className="row g-3 mb-4">
        {[
          { key: 'subjects', name: 'Subjects Master', icon: 'fa-book-open', desc: 'Maintain school subject catalogs and classifications.' },
          { key: 'subjectMapping', name: 'Subject-Class Linkage', icon: 'fa-link', desc: 'Link subjects to academic classes.' },
          { key: 'chapters', name: 'Chapters Matrix', icon: 'fa-bookmark', desc: 'Map class-subject chapters and progress logs.' },
          { key: 'outcomes', name: 'Learning Outcomes', icon: 'fa-lightbulb', desc: 'Define target criteria and learning milestones.', disabled: true }
        ].map(item => (
          <div className="col-md-6 col-lg-3" key={item.key}>
            <div 
              className={`erp-launcher-card ${item.disabled ? 'disabled-card' : ''}`}
              onClick={() => !item.disabled && setSelectedModule(item.key)}
            >
              <div className="launcher-icon-box">
                <i className={`fa-solid ${item.icon}`}></i>
              </div>
              <h6 className="fw-bold mt-2 mb-1">{item.name}</h6>
              <p className="small text-muted m-0">{item.desc}</p>
              {item.disabled && <span className="badge badge-soon">Coming Soon</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Group 3: Assessment Configuration */}
      <h5 className="fw-bold mb-3 section-heading"><i className="fa-solid fa-file-invoice me-2"></i>Assessment & Grades</h5>
      <div className="row g-3 mb-4">
        {[
          { key: 'assessments', name: 'Exam Configurations', icon: 'fa-file-signature', desc: 'Configure assessment schemes, weights, and parameters.' },
          { key: 'grades', name: 'Grade Scales', icon: 'fa-award', desc: 'Set grading matrix limits and boundaries.', disabled: true },
          { key: 'promotion', name: 'Promotion Rules', icon: 'fa-shield-halved', desc: 'Configure automatic year passing standards.', disabled: true },
          { key: 'schedules', name: 'Exam Schedule', icon: 'fa-calendar-days', desc: 'Track dates and timelines of upcoming exams.', disabled: true }
        ].map(item => (
          <div className="col-md-6 col-lg-3" key={item.key}>
            <div 
              className={`erp-launcher-card ${item.disabled ? 'disabled-card' : ''}`}
              onClick={() => !item.disabled && setSelectedModule(item.key)}
            >
              <div className="launcher-icon-box">
                <i className={`fa-solid ${item.icon}`}></i>
              </div>
              <h6 className="fw-bold mt-2 mb-1">{item.name}</h6>
              <p className="small text-muted m-0">{item.desc}</p>
              {item.disabled && <span className="badge badge-soon">Coming Soon</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Group 4: Academic Operations & Timetable */}
      <h5 className="fw-bold mb-3 section-heading"><i className="fa-solid fa-clock-rotate-left me-2"></i>Operations Ledger</h5>
      <div className="row g-3">
        {[
          { key: 'timetable', name: 'Timetable Matrix', icon: 'fa-clock', desc: 'Plan weekly class timetables and instructor slots.', disabled: true },
          { key: 'calendar', name: 'Academic Calendar', icon: 'fa-calendar-week', desc: 'Track vacations, holidays and operational dates.', disabled: true },
          { key: 'attendance', name: 'Attendance Rules', icon: 'fa-clipboard-user', desc: 'Define rules for attendance marking.', disabled: true }
        ].map(item => (
          <div className="col-md-6 col-lg-3" key={item.key}>
            <div 
              className={`erp-launcher-card ${item.disabled ? 'disabled-card' : ''}`}
              onClick={() => !item.disabled && setSelectedModule(item.key)}
            >
              <div className="launcher-icon-box">
                <i className={`fa-solid ${item.icon}`}></i>
              </div>
              <h6 className="fw-bold mt-2 mb-1">{item.name}</h6>
              <p className="small text-muted m-0">{item.desc}</p>
              {item.disabled && <span className="badge badge-soon">Coming Soon</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Group 5: Reports & Analytics */}
      <h5 className="fw-bold mt-4 mb-3 section-heading"><i className="fa-solid fa-chart-line me-2"></i>BI Reports & Analytics</h5>
      <div className="row g-3">
        {[
          { key: 'reports', name: 'Curriculum Progress', icon: 'fa-chart-pie', desc: 'Track curriculum completion & stats.' }
        ].map(item => (
          <div className="col-md-6 col-lg-3" key={item.key}>
            <div 
              className="erp-launcher-card"
              onClick={() => setSelectedModule(item.key)}
            >
              <div className="launcher-icon-box" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                <i className={`fa-solid ${item.icon}`}></i>
              </div>
              <h6 className="fw-bold mt-2 mb-1">{item.name}</h6>
              <p className="small text-muted m-0">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
