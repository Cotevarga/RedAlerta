import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Bus, AlertTriangle, MessageSquare, ShieldCheck, LogOut,
  Activity, MapPin, Clock
} from 'lucide-react';

const API = () => import.meta.env.VITE_API_URL || 'https://red-alerta-backend.onrender.com';

const headers = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

const Dashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('resumen');
  const [stats, setStats] = useState(null);
  const [incidentes, setIncidentes] = useState([]);
  const [consultas, setConsultas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }

    const fetchData = () => Promise.all([
      axios.get(`${API()}/api/admin/dashboard/stats`, headers()).catch(() => null),
      axios.get(`${API()}/api/admin/dashboard/incidentes`, headers()).catch(() => null),
      axios.get(`${API()}/api/admin/dashboard/consultas`, headers()).catch(() => null),
    ]).then(([s, i, c]) => {
      if (s?.status === 200) setStats(s.data);
      if (i?.status === 200) setIncidentes(i.data);
      if (c?.status === 200) setConsultas(c.data);
    }).catch(() => {}).finally(() => setLoading(false));

    fetchData();
    const keepAlive = setInterval(() => {
      axios.get(`${API()}/api/transporte/reporte?sector=Corral&dia=Lunes`).catch(() => {});
    }, 240000);

    return () => clearInterval(keepAlive);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleResolver = async (id) => {
    try {
      await axios.put(`${API()}/api/admin/dashboard/incidentes/${id}/resolver`, {}, headers());
      setIncidentes(prev => prev.map(i => i.id === id ? { ...i, estado: 'Resuelto' } : i));
    } catch (e) { console.error(e); }
  };

  const statsData = stats || { busesActivos: 3, consultasHoy: 0, incidentesActivos: 0, sectoresConectados: 4, totalIncidentes: 0, totalHorarios: 12 };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex flex-col justify-between p-6">
        <div>
          <div className="flex items-center space-x-3 mb-8">
            <ShieldCheck className="w-8 h-8 text-blue-500" />
            <div>
              <h1 className="text-white font-bold text-lg">Red Alerta</h1>
              <p className="text-xs text-slate-400">Panel Municipal</p>
            </div>
          </div>
          <nav className="space-y-2">
            {[
              { key: 'resumen', icon: Activity, label: 'Resumen General' },
              { key: 'buses', icon: Bus, label: 'Frecuencia de Buses' },
              { key: 'consultas', icon: MessageSquare, label: 'Consultas WhatsApp' },
              { key: 'emergencias', icon: AlertTriangle, label: 'Emergencias' },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition ${activeTab === tab.key ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}>
                <tab.icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
        <div className="pt-6 border-t border-slate-800">
          <button onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition">
            <LogOut className="w-5 h-5" /><span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Municipalidad de Corral</h2>
            <p className="text-sm text-slate-500">Monitoreo de conectividad y servicios rurales costeros</p>
          </div>
          <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-2">
            <span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="text-xs font-semibold text-slate-700">Sistema Operativo (Cloud)</span>
          </div>
        </header>

        {activeTab === 'resumen' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Buses en Ruta', value: statsData.busesActivos, icon: Bus, color: 'bg-blue-50 text-blue-600' },
                { label: 'Consultas Bot Hoy', value: statsData.consultasHoy, icon: MessageSquare, color: 'bg-emerald-50 text-emerald-600' },
                { label: 'Incidentes Activos', value: statsData.incidentesActivos, icon: AlertTriangle, color: 'bg-amber-50 text-amber-600' },
                { label: 'Sectores Conectados', value: statsData.sectoresConectados, icon: MapPin, color: 'bg-indigo-50 text-indigo-600' },
              ].map(card => (
                <div key={card.label} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{card.label}</p>
                    <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{card.value}</h3>
                  </div>
                  <div className={`p-3 rounded-xl ${card.color}`}><card.icon className="w-6 h-6" /></div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Incidentes Recientes</h3>
              {incidentes.length === 0 ? (
                <p className="text-sm text-slate-400">No hay incidentes registrados.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-semibold text-slate-400 uppercase">
                        <th className="py-3 px-4">Ruta</th>
                        <th className="py-3 px-4">Tipo</th>
                        <th className="py-3 px-4">Descripción</th>
                        <th className="py-3 px-4">Estado</th>
                        <th className="py-3 px-4">Fecha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                      {incidentes.slice(0, 5).map(inc => (
                        <tr key={inc.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-medium text-slate-800">{inc.ruta?.origen} - {inc.ruta?.destino}</td>
                          <td className="py-3 px-4">{inc.tipoIncidente}</td>
                          <td className="py-3 px-4 max-w-xs truncate">{inc.descripcion}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${inc.estado === 'Resuelto' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              {inc.estado}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-400">{inc.fechaReporte?.substring(0, 10)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'buses' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Control de Frecuencia de Buses Rurales</h3>
            <p className="text-sm text-slate-500 mb-6">Horarios registrados en el sistema.</p>
            <p className="text-slate-400 text-sm">Usa el bot de WhatsApp para consultar horarios por sector, o gestiona las rutas desde la base de datos municipal.</p>
          </div>
        )}

        {activeTab === 'consultas' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Historial de Consultas Ciudadanas</h3>
            <p className="text-sm text-slate-500 mb-6">Últimas consultas realizadas por vecinos vía WhatsApp.</p>
            {consultas.length === 0 ? (
              <p className="text-sm text-slate-400">Aún no hay consultas registradas.</p>
            ) : (
              <div className="space-y-3">
                {consultas.map(c => (
                  <div key={c.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{c.sector || 'General'}</span>
                        <p className="text-sm font-semibold text-slate-800 mt-1">{c.mensaje}</p>
                        <span className="text-xs text-slate-400">{c.tipo} - {c.fechaConsulta?.substring(0, 16).replace('T', ' ')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'emergencias' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-2">Gestión de Emergencias y Alertas</h3>
              <p className="text-sm text-slate-500 mb-4">Reportes críticos de caminos, clima o salud en la costa de Corral.</p>
              {incidentes.length === 0 ? (
                <p className="text-sm text-slate-400">No hay incidentes reportados.</p>
              ) : (
                <div className="space-y-3">
                  {incidentes.map(inc => (
                    <div key={inc.id} className="p-4 border border-red-100 bg-red-50/30 rounded-xl flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm">{inc.tipoIncidente} - <span className="text-red-600">{inc.ruta?.origen} - {inc.ruta?.destino}</span></h4>
                          <p className="text-xs text-slate-500">{inc.descripcion} — {inc.fechaReporte?.substring(0, 16).replace('T', ' ')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 text-xs font-bold rounded-lg ${inc.estado === 'Resuelto' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {inc.estado}
                        </span>
                        {inc.estado !== 'Resuelto' && (
                          <button onClick={() => handleResolver(inc.id)}
                            className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-colors">
                            Resolver
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
