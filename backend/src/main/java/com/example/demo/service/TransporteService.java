package com.example.demo.service;

import com.example.demo.DTO.DashboardStatsDTO;
import com.example.demo.DTO.IncidenteRequestDTO;
import com.example.demo.model.HorarioFijo;
import com.example.demo.model.IncidenteVial;
import com.example.demo.model.RegistroConsulta;
import com.example.demo.model.Ruta;
import com.example.demo.repository.HorarioFijoRepository;
import com.example.demo.repository.IncidenteVialRepository;
import com.example.demo.repository.RegistroConsultaRepository;
import com.example.demo.repository.RutaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Service
public class TransporteService {

    @Autowired
    private RutaRepository rutaRepository;

    @Autowired
    private HorarioFijoRepository horarioFijoRepository;

    @Autowired
    private IncidenteVialRepository incidenteVialRepository;

    @Autowired
    private RegistroConsultaRepository registroConsultaRepository;

    public String obtenerReporteMovilidad(String sectorNombre, String diaConsultado) {
        String sectorNormalizado = sectorNombre
            .replace("Chaihuin", "Chaihuín")
            .replace("chaihuin", "Chaihuín")
            .replace("CHAIHUIN", "Chaihuín");
        String diaNormalizado = diaConsultado
            .replace("Sabado", "Sábado")
            .replace("sabado", "Sábado")
            .replace("sábado", "Sábado")
            .replace("Miercoles", "Miércoles")
            .replace("miercoles", "Miércoles")
            .replace("miércoles", "Miércoles");
        List<Ruta> rutasEncontradas = rutaRepository.findByOrigenContainingIgnoreCaseOrDestinoContainingIgnoreCase(sectorNormalizado, sectorNormalizado);

        if (rutasEncontradas.isEmpty()) {
            return "🤖 No encontramos horarios registrados para el sector: '" + sectorNombre + "'. Verifique el nombre e intente nuevamente.";
        }

        StringBuilder respuesta = new StringBuilder();
        respuesta.append("🚌 *RED ALERTA - REPORTE DE MOVILIDAD*\n");
        respuesta.append("📍 Sector: ").append(sectorNombre).append("\n");
        respuesta.append("📆 Día: ").append(diaConsultado).append("\n");
        respuesta.append("------------------------------------------\n\n");

        for (Ruta ruta : rutasEncontradas) {
            respuesta.append(ruta.getEsSubsidiado() ? "🇨🇱 *SERVICIO SUBSIDIADO MTT*\n" : "🚍 *SERVICIO PARTICULAR*\n");
            respuesta.append("🔹 Trayecto: ").append(ruta.getOrigen()).append(" ➡️ ").append(ruta.getDestino()).append("\n");
            respuesta.append("💵 Tarifa: $").append(ruta.getTarifaEstimada()).append("\n");

            List<IncidenteVial> incidentes = incidenteVialRepository.findByRutaAndEstado(ruta, "Activo");
            if (!incidentes.isEmpty()) {
                respuesta.append("⚠️ *ALERTAS EN RUTA ACTIVAS:*\n");
                for (IncidenteVial incidente : incidentes) {
                    respuesta.append("  • [").append(incidente.getTipoIncidente()).append("]: ").append(incidente.getDescripcion()).append("\n");
                }
            }

            List<HorarioFijo> horarios = horarioFijoRepository.findByRutaAndDiaSemanaOrderByHoraSalidaAsc(ruta, diaNormalizado);
            
            if (horarios.isEmpty()) {
                respuesta.append("⏱️ No hay salidas programadas para hoy.\n");
            } else {
                respuesta.append("⏱️ Próximas salidas estimadas:\n");
                for (HorarioFijo horario : horarios) {
                    LocalTime horaSalidaCabecera = horario.getHoraSalida();
                    LocalTime horaEstimadaLlegada = horaSalidaCabecera;
                    if (sectorNombre.equalsIgnoreCase("Chaihuín") && ruta.getOrigen().equalsIgnoreCase("Corral")) {
                        horaEstimadaLlegada = horaSalidaCabecera.plusMinutes(35);
                    }

                    respuesta.append("  • ").append(horaEstimadaLlegada).append(" hrs. (Salida cabecera: ").append(horaSalidaCabecera).append(")\n");
                }
            }
            respuesta.append("\n------------------------------------------\n\n");
        }

        respuesta.append("ℹ️ _Responde 'EMERGENCIA' para ver los números de asistencia local de Corral._");
        return respuesta.toString();
    }

    public IncidenteVial registrarIncidente(IncidenteRequestDTO dto) {
        Ruta rutaAfectada = rutaRepository.findById(dto.getRutaId())
                .orElseThrow(() -> new RuntimeException("Error: La ruta especificada no existe en el sistema."));

        IncidenteVial nuevoIncidente = new IncidenteVial();
        nuevoIncidente.setRuta(rutaAfectada);
        nuevoIncidente.setTipoIncidente(dto.getTipoIncidente());
        nuevoIncidente.setDescripcion(dto.getDescripcion());
        
        return incidenteVialRepository.save(nuevoIncidente);
    }

    /**
     * ====================================================================
     * MÉTODO 3: LÓGICA DEL DASHBOARD MUNICIPAL (LECTURA Y ACTUALIZACIÓN)
     * ====================================================================
     */
     
    // Retorna todos los incidentes para mostrarlos en la tabla del panel web
    public List<IncidenteVial> obtenerTodosLosIncidentes() {
        // En un proyecto más grande aquí podríamos filtrar para no mostrar los de años anteriores,
        // pero por ahora traemos todos para que la muni tenga el historial completo.
        return incidenteVialRepository.findAll();
    }

    // Cambia el estado de un incidente de "Activo" a "Resuelto"
    public IncidenteVial resolverIncidente(Long incidenteId) {
        // Buscamos el incidente por su ID
        IncidenteVial incidente = incidenteVialRepository.findById(incidenteId)
                .orElseThrow(() -> new RuntimeException("Error: No se encontró el incidente con ID " + incidenteId));

        // Actualizamos el estado
        incidente.setEstado("Resuelto");
        
        // Guardamos los cambios en Neon
        return incidenteVialRepository.save(incidente);
    }

    public DashboardStatsDTO obtenerEstadisticasDashboard() {
        long busesActivos = rutaRepository.count();
        long consultasHoy = registroConsultaRepository.countByTipo("consulta");
        long incidentesActivos = incidenteVialRepository.findByEstado("Activo").size();
        long sectoresConectados = rutaRepository.findByOrigenContainingIgnoreCaseOrDestinoContainingIgnoreCase("", "").size();
        long totalIncidentes = incidenteVialRepository.count();
        long totalHorarios = horarioFijoRepository.count();

        if (sectoresConectados == 0) sectoresConectados = 4;

        return new DashboardStatsDTO(busesActivos, consultasHoy, incidentesActivos, sectoresConectados, totalIncidentes, totalHorarios);
    }

    public List<RegistroConsulta> obtenerConsultasRecientes() {
        return registroConsultaRepository.findTop50ByOrderByFechaConsultaDesc();
    }

    public RegistroConsulta registrarConsulta(String numeroWhatsapp, String sector, String mensaje, String tipo) {
        RegistroConsulta consulta = new RegistroConsulta();
        consulta.setNumeroWhatsapp(numeroWhatsapp);
        consulta.setSector(sector);
        consulta.setMensaje(mensaje);
        consulta.setTipo(tipo);
        consulta.setFechaConsulta(LocalDateTime.now());
        return registroConsultaRepository.save(consulta);
    }
}