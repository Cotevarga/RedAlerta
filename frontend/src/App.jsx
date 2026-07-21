import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './components/Dashboard';

function App() {
  return (
    <Router>
      <Routes>
        {/* Si alguien entra a la raíz de la página, lo mandamos directo al Login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Rutas principales del sistema */}
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}

export default App;