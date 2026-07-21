package com.example.demo.controller;

import com.example.demo.model.RegistroConsulta;
import com.example.demo.service.TransporteService;
import com.example.demo.service.WhatsAppStatusService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
public class TransporteController {

    @GetMapping({"/", "/api/ping"})
    public ResponseEntity<Map<String, String>> ping() {
        return ResponseEntity.ok(Map.of("status", "ok", "servicio", "Red Alerta"));
    }

    @Autowired
    private TransporteService transporteService;

    @Autowired
    private WhatsAppStatusService whatsAppStatusService;

    @GetMapping("/api/transporte/reporte")
    public ResponseEntity<String> consultarReporte(
            @RequestParam(value = "sector") String sector,
            @RequestParam(value = "dia", defaultValue = "Sábado") String dia) {
        return ResponseEntity.ok(transporteService.obtenerReporteMovilidad(sector, dia));
    }

    @PostMapping("/api/whatsapp/status")
    public ResponseEntity<?> recibirStatus(@RequestBody Map<String, String> body) {
        whatsAppStatusService.actualizar(
            body.getOrDefault("numero", "desconocido"),
            body.getOrDefault("status", "DISCONNECTED"),
            body.getOrDefault("qr", "")
        );
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @GetMapping("/api/whatsapp/qr")
    public ResponseEntity<Map<String, Object>> obtenerEstado() {
        return ResponseEntity.ok(whatsAppStatusService.getEstado());
    }

    @PostMapping("/api/whatsapp/consultas")
    public ResponseEntity<RegistroConsulta> registrarConsulta(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(transporteService.registrarConsulta(
            body.getOrDefault("numeroWhatsapp", "anonimo"),
            body.getOrDefault("sector", ""),
            body.getOrDefault("mensaje", ""),
            body.getOrDefault("tipo", "consulta")
        ));
    }
}
