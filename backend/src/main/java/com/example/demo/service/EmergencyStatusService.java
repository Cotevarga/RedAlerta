package com.example.demo.service;

import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class EmergencyStatusService {

    private String portStatus = "ABIERTO";
    private String portDetail = "RVC Corral operativo con normalidad.";
    private String weatherAlert = "Normal";
    private String weatherDetail = "Sin alertas meteorológicas activas en la comuna de Corral.";
    private String roadAlert = "Normal";
    private String roadDetail = "Ruta T-450 transitable sin restricciones.";

    @PostConstruct
    public void init() {
        actualizarMock();
    }

    /*
     * ─────────────────────────────────────────────────────────────
     *  FASE 2 — INTEGRACIÓN CON API EXTERNA
     * ─────────────────────────────────────────────────────────────
     *  Cuando se conecte la API real de la Capitanía de Puerto
     *  (RVC) o el servicio meteorológico (DMC/MeteoChile),
     *  reemplazar los valores mock de abajo con llamadas HTTP:
     *
     *  Ejemplo (API Puerto):
     *    GET https://api.directemar.cl/rvc/estado
     *    → { "estado": "CERRADO", "detalle": "Marejadas..." }
     *
     *  Ejemplo (API Clima):
     *    GET https://api.meteochile.gob.cl/alertas
     *    → { "alerta": "Normal", "detalle": "..." }
     *
     *  Reemplazar en el método actualizarMock() por:
     *    this.portStatus = respuestaApi.get("estado");
     *    this.weatherAlert = respuestaApi.get("alerta");
     * ─────────────────────────────────────────────────────────────
     */

    private void actualizarMock() {
        this.portStatus = "ABIERTO";
        this.portDetail = "RVC Corral operativo con normalidad. No se registran restricciones para embarcaciones menores.";
        this.weatherAlert = "Normal";
        this.weatherDetail = "Sin alertas meteorológicas activas en la comuna de Corral.";
        this.roadAlert = "Normal";
        this.roadDetail = "Ruta T-450 transitable sin restricciones.";
    }

    public void setPortStatus(String status, String detail) {
        this.portStatus = status;
        this.portDetail = detail;
    }

    public void setWeatherAlert(String alert, String detail) {
        this.weatherAlert = alert;
        this.weatherDetail = detail;
    }

    public void setRoadAlert(String alert, String detail) {
        this.roadAlert = alert;
        this.roadDetail = detail;
    }

    public void resetToMock() {
        actualizarMock();
    }

    public String getPortStatusLine() {
        if ("CERRADO".equals(portStatus)) {
            return "⚠️ *AVISO RVC:* Puerto de Corral *CERRADO* — " + portDetail;
        }
        return "";
    }

    public String getWeatherLine() {
        if (!"Normal".equals(weatherAlert)) {
            return "🌤️ *Alerta Climática:* " + weatherAlert + " — " + weatherDetail;
        }
        return "";
    }

    public String getRoadLine() {
        if (!"Normal".equals(roadAlert)) {
            return "🛣️ *Estado Ruta T-450:* " + roadAlert + " — " + roadDetail;
        }
        return "";
    }

    public String getAlertasResumen() {
        StringBuilder sb = new StringBuilder();

        if ("CERRADO".equals(portStatus)) {
            sb.append("⚠️ *PUERTO CERRADO* — ").append(portDetail).append("\n");
        }
        if (!"Normal".equals(weatherAlert)) {
            sb.append("🌤️ *CLIMA:* ").append(weatherAlert).append(" — ").append(weatherDetail).append("\n");
        }
        if (!"Normal".equals(roadAlert)) {
            sb.append("🛣️ *RUTA T-450:* ").append(roadAlert).append(" — ").append(roadDetail).append("\n");
        }

        return sb.toString();
    }

    public Map<String, Object> getEstadoCompleto() {
        Map<String, Object> estado = new LinkedHashMap<>();
        estado.put("puertoEstado", portStatus);
        estado.put("puertoDetalle", portDetail);
        estado.put("climaAlerta", weatherAlert);
        estado.put("climaDetalle", weatherDetail);
        estado.put("rutaAlerta", roadAlert);
        estado.put("rutaDetalle", roadDetail);
        return estado;
    }
}
