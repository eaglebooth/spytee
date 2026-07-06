import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import RedbubbleTrend from './pages/RedbubbleTrend';
import TeepublicTrend from './pages/TeepublicTrend';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Header />
        <div className="app-content">
          <Routes>
            <Route path="/" element={<Navigate to="/redbubble" replace />} />
            <Route path="/redbubble" element={<RedbubbleTrend />} />
            <Route path="/teepublic" element={<TeepublicTrend />} />
            <Route path="*" element={<Navigate to="/redbubble" replace />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
