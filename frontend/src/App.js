import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './Components/Navigation';
import OverView from './Components/OverView';
import './Components/style.css';
import Students from './Components/Students';
import AddNewStudent from './Components/AddNewStudent';
import Classes from './Components/Classes';
import Payments from './Components/Payments';

function App() {
  return (
    <Router>
      <div className="App">
        <Navigation />
        <div className='content'>
        <Routes>
          <Route path="/" element={<OverView />} />
          <Route path="/Students" element={<Students />} />
          <Route path="/AddNewStudent" element={<AddNewStudent />} />
          <Route path="/Classes" element={<Classes />} />
          <Route path="/Payments" element={<Payments />} />
        </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
