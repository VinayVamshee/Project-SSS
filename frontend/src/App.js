import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navigation from './Components/Navigation/Navigation';
import OverView from './Components/OverView/OverView';
import './Components/style.css';
import Students from './Components/Students/Students';
import AddNewStudent from './Components/AddNewStudent/AddNewStudent';
import Classes from './Components/Classes/Classes';
import Payments from './Components/Payments/Payments';
import Results from './Components/Results/Results';
import AssessmentAnalytics from './Components/AssessmentAnalytics/AssessmentAnalytics';

import Master from './Components/Master/Master';
import Developer from './Components/Developer/Developer';
import QuestionPaper from './Components/QuestionPaper/QuestionPaper';
import QuestionPaperV2 from './Components/QuestionPaperV2/QuestionPaperV2';
import Login from './Components/Login/Login';
import HRFinanceHub from './Components/HRFinance/HRFinanceHub';

function AppContent() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  const isImpersonating = localStorage.getItem("isImpersonating") === "true";
  const impersonatedUsername = localStorage.getItem("impersonatedUsername") || "";
  const impersonatedRole = localStorage.getItem("impersonatedRole") || "";

  const handleStopImpersonation = () => {
    localStorage.setItem("isDev", "true");
    localStorage.setItem("userRole", localStorage.getItem("originalUserRole") || "");
    localStorage.setItem("userType", localStorage.getItem("originalUserType") || "");
    localStorage.removeItem("isImpersonating");
    localStorage.removeItem("impersonatedUsername");
    localStorage.removeItem("impersonatedRole");
    localStorage.removeItem("originalIsDev");
    localStorage.removeItem("originalUserRole");
    localStorage.removeItem("originalUserType");
    alert("🔄 Returned to Developer Mode.");
    window.location.href = "/Developer";
  };

  return (
    <div className="App" style={{ flexDirection: 'column' }}>
      {isImpersonating && (
        <div style={{
          backgroundColor: '#ffc107',
          color: '#212529',
          padding: '8px 16px',
          fontWeight: 'bold',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          fontSize: '14px',
          zIndex: 9999
        }}>
          <span>
            <i className="fas fa-user-secret me-2"></i>
            You are currently impersonating <strong>{impersonatedUsername}</strong> as <strong>{impersonatedRole.toUpperCase()}</strong>.
          </span>
          <button 
            className="btn btn-sm btn-dark fw-bold px-3 py-1"
            onClick={handleStopImpersonation}
            style={{ borderRadius: '6px', fontSize: '12px' }}
          >
            <i className="fas fa-sign-out-alt me-1"></i> Stop Impersonation
          </button>
        </div>
      )}
      <div style={{ display: 'flex', width: '100%', flex: 1 }}>
        {!isLoginPage && <Navigation />}
        <div className={isLoginPage ? 'login-page-wrapper' : 'content'}>
          <Routes>
            <Route path="/" element={<OverView />} />
            <Route path="/login" element={<Login />} />
            <Route path="/Students" element={<Students />} />
            <Route path="/AddNewStudent" element={<AddNewStudent />} />
            <Route path="/Classes" element={<Classes />} />
            <Route path="/Results" element={<Results />} />
            <Route path="/AssessmentAnalytics" element={<AssessmentAnalytics />} />
            <Route path="/Payments" element={<Payments />} />
            <Route path="/QuestionPaper" element={<QuestionPaper />} />
            <Route path="/Settings" element={<Master />} />
            <Route path="/Developer" element={<Developer />} />
            <Route path="/QuestionPaperV2" element={<QuestionPaperV2 />} />
            <Route path="/HRFinance" element={<HRFinanceHub />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
