package com.example.demo.controller;

import com.example.demo.DTO.DashboardStatsDTO;
import com.example.demo.model.IncidenteVial;
import com.example.demo.model.RegistroConsulta;
import com.example.demo.service.AdminConfigService;
import com.example.demo.service.TransporteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/dashboard")
public class DashboardController {

    @Autowired
    private TransporteService transporteService;

    @Autowired
    private AdminConfigService adminConfigService;

    @GetMapping("/stats")
    public ResponseEntity<DashboardStatsDTO> obtenerEstadisticas() {
        return ResponseEntity.ok(transporteService.obtenerEstadisticasDashboard());
    }

    @GetMapping("/incidentes")
    public ResponseEntity<List<IncidenteVial>> listarIncidentes() {
        return ResponseEntity.ok(transporteService.obtenerTodosLosIncidentes());
    }

    @PutMapping("/incidentes/{id}/resolver")
    public ResponseEntity<IncidenteVial> resolverIncidente(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(transporteService.resolverIncidente(id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(null);
        }
    }

    @GetMapping("/consultas")
    public ResponseEntity<List<RegistroConsulta>> listarConsultas() {
        return ResponseEntity.ok(transporteService.obtenerConsultasRecientes());
    }

    @PostMapping("/consultas")
    public ResponseEntity<RegistroConsulta> registrarConsulta(@RequestBody Map<String, String> body) {
        RegistroConsulta consulta = transporteService.registrarConsulta(
            body.getOrDefault("numeroWhatsapp", "desconocido"),
            body.getOrDefault("sector", ""),
            body.getOrDefault("mensaje", ""),
            body.getOrDefault("tipo", "consulta")
        );
        return ResponseEntity.ok(consulta);
    }

    @PutMapping("/password")
    public ResponseEntity<?> cambiarPassword(@RequestBody Map<String, String> body) {
        String username = body.getOrDefault("username", "");
        String oldPassword = body.getOrDefault("oldPassword", "");
        String newPassword = body.getOrDefault("newPassword", "");

        if (newPassword.length() < 6) {
            return ResponseEntity.badRequest().body("La nueva contraseña debe tener al menos 6 caracteres.");
        }

        boolean cambiado = adminConfigService.cambiarPassword(username, oldPassword, newPassword);
        if (cambiado) {
            return ResponseEntity.ok(Map.of("mensaje", "Contraseña actualizada exitosamente."));
        } else {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Credenciales actuales incorrectas.");
        }
    }
}
