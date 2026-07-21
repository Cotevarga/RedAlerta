package com.example.demo.controller;

import com.example.demo.model.IncidenteVial;
import com.example.demo.service.TransporteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/dashboard") // ¡Ruta protegida por Token JWT!
public class DashboardController {

    @Autowired
    private TransporteService transporteService;

    /**
     * Endpoint GET para listar todos los incidentes.
     * Solo accesible para funcionarios municipales con token.
     */
    @GetMapping("/incidentes")
    public ResponseEntity<List<IncidenteVial>> listarIncidentes() {
        List<IncidenteVial> lista = transporteService.obtenerTodosLosIncidentes();
        return ResponseEntity.ok(lista);
    }

    /**
     * Endpoint PUT para actualizar un incidente a "Resuelto".
     * Se usa el ID del incidente en la URL (ej: /api/admin/dashboard/incidentes/1/resolver)
     */
    @PutMapping("/incidentes/{id}/resolver")
    public ResponseEntity<IncidenteVial> resolverIncidente(@PathVariable Long id) {
        try {
            IncidenteVial incidenteResuelto = transporteService.resolverIncidente(id);
            return ResponseEntity.ok(incidenteResuelto);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(null);
        }
    }
}