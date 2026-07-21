package com.example.demo.controller;

import com.example.demo.DTO.IncidenteRequestDTO;
import com.example.demo.model.IncidenteVial;
import com.example.demo.service.TransporteService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/admin") 
public class AdminController {

    @Autowired
    private TransporteService transporteService;

    // Mapa en memoria para controlar el spam por dirección IP
    private final Map<String, Long> historialPeticiones = new ConcurrentHashMap<>();
    private static final long TIEMPO_ESPERA_MS = 60000; // 1 minuto de enfriamiento

    @PostMapping("/incidentes")
    public ResponseEntity<?> reportarIncidente(@RequestBody IncidenteRequestDTO dto, HttpServletRequest request) {
        
        String ipCliente = request.getRemoteAddr();
        long tiempoActual = System.currentTimeMillis();

        if (historialPeticiones.containsKey(ipCliente)) {
            long ultimoReporte = historialPeticiones.get(ipCliente);
            long tiempoTranscurrido = tiempoActual - ultimoReporte;

            if (tiempoTranscurrido < TIEMPO_ESPERA_MS) {
                long segundosFaltantes = (TIEMPO_ESPERA_MS - tiempoTranscurrido) / 1000;
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                        .body("⏳ Por favor, espera " + segundosFaltantes + " segundos antes de enviar otra alerta comunitaria.");
            }
        }

        historialPeticiones.put(ipCliente, tiempoActual);

        try {
            IncidenteVial incidenteCreado = transporteService.registrarIncidente(dto);
            return ResponseEntity.ok(incidenteCreado);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Error al registrar: " + e.getMessage());
        }
    }
}