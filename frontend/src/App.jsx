import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';

// Un componente temporal para el Dashboard mientras lo construimos
const DashboardTemporal = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <h1 className="text-3xl font-bold text-gray-700">🚧 Dashboard de la Municipalidad en Construcción 🚧</h1>
  </div>
);

function App() {
  return (
    <Router>
      <Routes>
        {/* Si alguien entra a la raíz de la página, lo mandamos directo al Login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Nuestras dos rutas principales */}
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<DashboardTemporal />} />
      </Routes>
    </Router>
  );
}

export default App;