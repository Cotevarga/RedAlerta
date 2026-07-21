import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Bus, AlertTriangle, MessageSquare, ShieldCheck, LogOut,
  Activity, MapPin, Lock, X, CheckCircle, Smartphone
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

  const [whatsApp, setWhatsApp] = useState({ status: 'DISCONNECTED', qr: null, numero: '—' });

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordError, setPasswordError] = useState('');

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
    }).catch(() => {});

    fetchData();
    const keepAlive = setInterval(() => {
      axios.get(`${API()}/api/transporte/reporte?sector=Corral&dia=Lunes`).catch(() => {});
    }, 240000);

    const waPoll = setInterval(() => {
      axios.get(`${API()}/api/whatsapp/qr`).then(r => {
        if (r.status === 200) setWhatsApp(r.data);
      }).catch(() => {});
    }, 5000);

    return () => { clearInterval(keepAlive); clearInterval(waPoll); };
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

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMsg('');
    setPasswordError('');

    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas nuevas no coinciden.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    try {
      const username = localStorage.getItem('username') || 'adminMuni';
      const res = await axios.put(`${API()}/api/admin/dashboard/password`, {
        username, oldPassword, newPassword
      }, headers());
      setPasswordMsg(res.data.mensaje || 'Contraseña actualizada.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setShowPasswordModal(false), 1500);
    } catch (err) {
      setPasswordError(err.response?.data || 'Error al cambiar la contraseña.');
    }
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
              { key: 'whatsapp', icon: Smartphone, label: 'WhatsApp' },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition ${activeTab === tab.key ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}>
                <tab.icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
        <div className="pt-6 border-t border-slate-800 space-y-2">
          <button onClick={() => { setPasswordMsg(''); setPasswordError(''); setShowPasswordModal(true); }}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 transition">
            <Lock className="w-5 h-5" /><span>Cambiar Contraseña</span>
          </button>
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

        {activeTab === 'whatsapp' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Estado de WhatsApp</h3>
            <p className="text-sm text-slate-500 mb-6">Monitoreo de la conexión del bot municipal.</p>

            <div className="flex items-center gap-3 mb-6">
              <span className={`w-4 h-4 rounded-full ${whatsApp.status === 'CONNECTED' ? 'bg-emerald-500' : whatsApp.status === 'SCAN_QR' ? 'bg-amber-500 animate-pulse' : 'bg-red-500'}`}></span>
              <span className="text-lg font-semibold text-slate-700">
                {whatsApp.status === 'CONNECTED' ? 'Conectado' : whatsApp.status === 'SCAN_QR' ? 'Esperando escaneo QR' : 'Desconectado'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Número Oficial</p>
                  <p className="text-lg font-semibold text-slate-800">{whatsApp.numero || 'No configurado'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Última Actualización</p>
                  <p className="text-sm text-slate-600">{whatsApp.lastUpdate ? new Date(whatsApp.lastUpdate).toLocaleTimeString('es-CL') : '—'}</p>
                </div>
              </div>

              {whatsApp.status === 'SCAN_QR' && whatsApp.qr && (
                <div className="flex flex-col items-center">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Código QR</p>
                  <img src={whatsApp.qr} alt="QR WhatsApp" className="w-48 h-48 border border-slate-200 rounded-xl" />
                  <p className="text-xs text-slate-400 mt-2">Escanea con WhatsApp → Vincular dispositivo</p>
                </div>
              )}
            </div>

            {whatsApp.status === 'DISCONNECTED' && (
              <div className="mt-4 p-4 bg-amber-50 text-amber-700 rounded-xl text-sm">
                ⚠️ El bot no está conectado. Revisa los logs del servicio en Render para escanear el QR.
              </div>
            )}
          </div>
        )}
      </main>

      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
            <button onClick={() => setShowPasswordModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-slate-800 mb-6">Cambiar Contraseña</h3>

            {passwordMsg && (
              <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 rounded-lg flex items-center gap-2 text-sm">
                <CheckCircle className="w-5 h-5" /><span>{passwordMsg}</span>
              </div>
            )}
            {passwordError && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg flex items-center gap-2 text-sm">
                <AlertTriangle className="w-5 h-5" /><span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña Actual</label>
                <input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Contraseña</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required minLength={6} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Nueva Contraseña</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required />
              </div>
              <button type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors">
                Actualizar Contraseña
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
