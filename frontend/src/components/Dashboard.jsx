import { useNavigate } from 'react-router-dom';
import { LogOut, Bus, AlertTriangle, Clock, Users } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bus className="w-8 h-8" />
            <div>
              <h1 className="text-xl font-bold">Red Alerta Rural</h1>
              <p className="text-blue-100 text-sm">Panel de Gestión Municipal</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center gap-3 mb-2">
              <Bus className="w-6 h-6 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-700">Rutas Activas</h2>
            </div>
            <p className="text-3xl font-bold text-blue-600">3</p>
            <p className="text-sm text-gray-500">Chaihuin, Corral, Huiro</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
              <h2 className="text-lg font-semibold text-gray-700">Incidentes</h2>
            </div>
            <p className="text-3xl font-bold text-amber-500">0</p>
            <p className="text-sm text-gray-500">Pendientes de revisión</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-6 h-6 text-green-600" />
              <h2 className="text-lg font-semibold text-gray-700">Horarios</h2>
            </div>
            <p className="text-3xl font-bold text-green-600">12</p>
            <p className="text-sm text-gray-500">Horarios registrados</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-6 h-6 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-700">Bienvenido al Sistema</h2>
          </div>
          <p className="text-gray-600">
            Panel de administración de la Red Alerta Rural. Desde aquí puedes gestionar
            las rutas de transporte, revisar incidentes reportados por la comunidad y
            mantener actualizados los horarios de los servicios.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
