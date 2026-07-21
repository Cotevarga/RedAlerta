package com.example.demo.controller;

import com.example.demo.model.IncidenteVial;
import com.example.demo.service.TransporteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
public class EmergenciasController {

    @Autowired
    private TransporteService transporteService;

    @PostMapping("/api/emergencias")
    public ResponseEntity<?> reportar(@RequestBody Map<String, String> body) {
        try {
            Long rutaId = Long.parseLong(body.getOrDefault("rutaId", "1"));
            String tipo = body.getOrDefault("tipoIncidente", "Otro");
            String desc = body.getOrDefault("descripcion", "");

            com.example.demo.DTO.IncidenteRequestDTO dto = new com.example.demo.DTO.IncidenteRequestDTO();
            dto.setRutaId(rutaId);
            dto.setTipoIncidente(tipo);
            dto.setDescripcion(desc);
            IncidenteVial incidente = transporteService.registrarIncidente(dto);
            return ResponseEntity.ok(Map.of(
                "ok", true, "id", incidente.getId(),
                "tipo", incidente.getTipoIncidente(),
                "estado", incidente.getEstado()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("ok", false, "error", e.getMessage()));
        }
    }
}
