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
import Master from './Components/Master/Master';
import Developer from './Components/Developer/Developer';
import QuestionPaper from './Components/QuestionPaper/QuestionPaper';
import QuestionPaperV2 from './Components/QuestionPaperV2/QuestionPaperV2';
import Login from './Components/Login/Login';

function AppContent() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  return (
    <div className="App">
      {!isLoginPage && <Navigation />}
      <div className={isLoginPage ? 'login-page-wrapper' : 'content'}>
        <Routes>
          <Route path="/" element={<OverView />} />
          <Route path="/login" element={<Login />} />
          <Route path="/Students" element={<Students />} />
          <Route path="/AddNewStudent" element={<AddNewStudent />} />
          <Route path="/Classes" element={<Classes />} />
          <Route path="/Results" element={<Results />} />
          <Route path="/Payments" element={<Payments />} />
          <Route path="/QuestionPaper" element={<QuestionPaper />} />
          <Route path="/Settings" element={<Master />} />
          <Route path="/Developer" element={<Developer />} />
          <Route path="/QuestionPaperV2" element={<QuestionPaperV2 />} />
        </Routes>
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
