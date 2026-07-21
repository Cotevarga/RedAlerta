package com.example.demo.controller;

import com.example.demo.model.Parada;
import com.example.demo.service.BusCalculationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/paradas")
public class ParadaController {

    @Autowired
    private BusCalculationService busCalculationService;

    @GetMapping
    public ResponseEntity<List<Parada>> listarTodas() {
        return ResponseEntity.ok(busCalculationService.getTodasLasParadas());
    }

    @GetMapping("/calcular")
    public ResponseEntity<Map<String, Object>> calcularLlegada(
            @RequestParam String paradaId,
            @RequestParam String horaSalida) {
        return ResponseEntity.ok(busCalculationService.getInfoCompletaParada(paradaId, horaSalida));
    }

    @GetMapping("/alerta")
    public ResponseEntity<Map<String, Object>> checkAlerta(
            @RequestParam String paradaId,
            @RequestParam String horaSalida) {
        boolean alertaActiva = busCalculationService.faltan8Minutos(paradaId, horaSalida, LocalTime.now());
        Map<String, Object> respuesta = busCalculationService.getInfoCompletaParada(paradaId, horaSalida);
        respuesta.put("alertaActiva", alertaActiva);
        return ResponseEntity.ok(respuesta);
    }
}
