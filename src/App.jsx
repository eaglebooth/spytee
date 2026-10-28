import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import Header from './components/Header';
import RedbubbleTrend from './pages/RedbubbleTrend';
import TeepublicTrend from './pages/TeepublicTrend';
import TeepublicExtension from './pages/TeepublicExtension';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Header />
        <div className="app-content">
          <div style={{ textAlign: 'right', padding: '10px 24px 0' }}>
            <Link to="/teepublic-extension">TeePublic Extension: nhập dữ liệu</Link>
          </div>
          <Routes>
            <Route path="/" element={<Navigate to="/redbubble" replace />} />
            <Route path="/redbubble" element={<RedbubbleTrend />} />
            <Route path="/teepublic" element={<TeepublicTrend />} />
            <Route path="/teepublic-extension" element={<TeepublicExtension />} />
            <Route path="*" element={<Navigate to="/redbubble" replace />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
