package com.example.demo.controller;

import com.example.demo.service.EmergencyStatusService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/emergencia")
public class EmergencyController {

    @Autowired
    private EmergencyStatusService emergencyStatusService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> obtenerEstado() {
        return ResponseEntity.ok(emergencyStatusService.getEstadoCompleto());
    }

    @PutMapping("/puerto")
    public ResponseEntity<?> actualizarPuerto(@RequestBody Map<String, String> body) {
        emergencyStatusService.setPortStatus(
            body.getOrDefault("estado", "ABIERTO"),
            body.getOrDefault("detalle", "")
        );
        return ResponseEntity.ok(emergencyStatusService.getEstadoCompleto());
    }

    @PutMapping("/clima")
    public ResponseEntity<?> actualizarClima(@RequestBody Map<String, String> body) {
        emergencyStatusService.setWeatherAlert(
            body.getOrDefault("alerta", "Normal"),
            body.getOrDefault("detalle", "")
        );
        return ResponseEntity.ok(emergencyStatusService.getEstadoCompleto());
    }

    @PutMapping("/ruta")
    public ResponseEntity<?> actualizarRuta(@RequestBody Map<String, String> body) {
        emergencyStatusService.setRoadAlert(
            body.getOrDefault("alerta", "Normal"),
            body.getOrDefault("detalle", "")
        );
        return ResponseEntity.ok(emergencyStatusService.getEstadoCompleto());
    }

    @PostMapping("/reset")
    public ResponseEntity<?> resetear() {
        emergencyStatusService.resetToMock();
        return ResponseEntity.ok(emergencyStatusService.getEstadoCompleto());
    }
}
