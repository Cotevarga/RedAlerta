import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Bus, 
  AlertTriangle, 
  MessageSquare, 
  Calendar, 
  ShieldCheck, 
  LogOut, 
  Activity, 
  MapPin, 
  Users, 
  Clock 
} from 'lucide-react';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('resumen');
  const [estadisticas, setEstadisticas] = useState({
    busesActivos: 12,
    consultasHoy: 148,
    emergenciasPendientes: 3,
    incidentesReportados: 5
  });

  const [incidentes, setIncidentes] = useState([
    { id: 1, sector: 'Chaihuín', tipo: 'Corte de Ruta', estado: 'En revisión', hora: '08:30 AM' },
    { id: 2, sector: 'Huiro', tipo: 'Demora en Frecuencia', estado: 'Solucionado', hora: '09:15 AM' },
    { id: 3, sector: 'Corral Centro', tipo: 'Emergencia Médica Rural', estado: 'Atendido', hora: '10:00 AM' }
  ]);

  const [horariosBuses, setHorariosBuses] = useState([
    { id: 1, sector: 'Corral - Chaihuín', salida: '07:00 AM', estado: 'A tiempo', bus: 'Bus 01' },
    { id: 2, sector: 'Corral - Huiro', salida: '08:30 AM', estado: 'Demorado', bus: 'Bus 04' },
    { id: 3, sector: 'Corral - La Aguada', salida: '12:00 PM', estado: 'Programado', bus: 'Bus 02' }
  ]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      
      {/* SIDEBAR DE NAVEGACIÓN */}
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
            <button 
              onClick={() => setActiveTab('resumen')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition ${activeTab === 'resumen' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}
            >
              <Activity className="w-5 h-5" />
              <span>Resumen General</span>
            </button>

            <button 
              onClick={() => setActiveTab('buses')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition ${activeTab === 'buses' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}
            >
              <Bus className="w-5 h-5" />
              <span>Frecuencia de Buses</span>
            </button>

            <button 
              onClick={() => setActiveTab('consultas')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition ${activeTab === 'consultas' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}
            >
              <MessageSquare className="w-5 h-5" />
              <span>Consultas WhatsApp</span>
            </button>

            <button 
              onClick={() => setActiveTab('emergencias')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition ${activeTab === 'emergencias' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}
            >
              <AlertTriangle className="w-5 h-5" />
              <span>Emergencias e Incidentes</span>
            </button>
          </nav>
        </div>

        <div className="pt-6 border-t border-slate-800">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition"
          >
            <LogOut className="w-5 h-5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        
        {/* Cabecera */}
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

        {/* ================= VISTA: RESUMEN GENERAL ================= */}
        {activeTab === 'resumen' && (
          <div className="space-y-6">
            {/* Tarjetas de Estadísticas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Buses en Ruta</p>
                  <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{estadisticas.busesActivos}</h3>
                </div>
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Bus className="w-6 h-6" /></div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Consultas Bot Hoy</p>
                  <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{estadisticas.consultasHoy}</h3>
                </div>
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><MessageSquare className="w-6 h-6" /></div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Incidentes Activos</p>
                  <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{estadisticas.emergenciasPendientes}</h3>
                </div>
                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><AlertTriangle className="w-6 h-6" /></div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Sectores Conectados</p>
                  <h3 className="text-3xl font-extrabold text-slate-800 mt-1">4</h3>
                </div>
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><MapPin className="w-6 h-6" /></div>
              </div>
            </div>

            {/* Tabla de Actividad Reciente */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Registro Reciente de Incidentes y Rutas</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold text-slate-400 uppercase">
                      <th className="py-3 px-4">Sector</th>
                      <th className="py-3 px-4">Tipo de Evento</th>
                      <th className="py-3 px-4">Estado</th>
                      <th className="py-3 px-4">Hora</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                    {incidentes.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-medium text-slate-800">{item.sector}</td>
                        <td className="py-3 px-4">{item.tipo}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            item.estado === 'Solucionado' || item.estado === 'Atendido' 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {item.estado}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400">{item.hora}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= VISTA: FRECUENCIA DE BUSES ================= */}
        {activeTab === 'buses' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Control de Frecuencia de Buses Rurales</h3>
                <p className="text-sm text-slate-500">Horarios y estados informados por las líneas de transporte hacia la costa.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {horariosBuses.map((bus) => (
                <div key={bus.id} className="border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md">{bus.bus}</span>
                      <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">{bus.estado}</span>
                    </div>
                    <h4 className="font-bold text-slate-800 text-lg mb-2">{bus.sector}</h4>
                    <p className="text-sm text-slate-500 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-slate-400" /> Salida programada: {bus.salida}
                    </p>
                  </div>
                  <div className="mt-5 pt-4 border-t border-slate-100 flex justify-between">
                    <span className="text-xs text-slate-400">Monitoreado en línea</span>
                    <button className="text-xs font-semibold text-blue-600 hover:underline">Actualizar Estado</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= VISTA: CONSULTAS WHATSAPP ================= */}
        {activeTab === 'consultas' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div>
              <h3 className="text-xl font-bold text-slate-800">Historial de Consultas Ciudadanas (Bot WhatsApp)</h3>
              <p className="text-sm text-slate-500">Registro de las preguntas más frecuentes realizadas por los vecinos de los sectores rurales.</p>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                <div>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Sector Chaihuín</span>
                  <p className="text-sm font-semibold text-slate-800 mt-1">"¿A qué hora pasa el micro el día sábado?"</p>
                  <span className="text-xs text-slate-400">Consultado hace 12 minutos vía WhatsApp</span>
                </div>
                <span className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-medium">Respondido automáticamente</span>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                <div>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">Sector Huiro</span>
                  <p className="text-sm font-semibold text-slate-800 mt-1">"Emergencia posta rural / números de contacto"</p>
                  <span className="text-xs text-slate-400">Consultado hace 45 minutos vía WhatsApp</span>
                </div>
                <span className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-medium">Respondido automáticamente</span>
              </div>
            </div>
          </div>
        )}

        {/* ================= VISTA: EMERGENCIAS ================= */}
        {activeTab === 'emergencias' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div>
              <h3 className="text-xl font-bold text-slate-800">Gestión de Emergencias y Alertas Ciudadanas</h3>
              <p className="text-sm text-slate-500">Reportes críticos de caminos, clima o salud en la costa de Corral.</p>
            </div>

            <div className="space-y-3">
              {incidentes.map((inc) => (
                <div key={inc.id} className="p-4 border border-red-100 bg-red-50/30 rounded-xl flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{inc.tipo} - <span className="text-red-600">{inc.sector}</span></h4>
                      <p className="text-xs text-slate-500">Registrado a las {inc.hora}</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-lg">
                    {inc.estado}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}