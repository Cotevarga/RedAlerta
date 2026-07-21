package com.example.demo.controller;

import com.example.demo.model.RegistroConsulta;
import com.example.demo.service.TransporteService;
import com.example.demo.service.WhatsAppStatusService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
public class WhatsAppController {

    @Autowired
    private WhatsAppStatusService whatsAppStatusService;

    @Autowired
    private TransporteService transporteService;

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
        RegistroConsulta consulta = transporteService.registrarConsulta(
            body.getOrDefault("numeroWhatsapp", "anonimo"),
            body.getOrDefault("sector", ""),
            body.getOrDefault("mensaje", ""),
            body.getOrDefault("tipo", "consulta")
        );
        return ResponseEntity.ok(consulta);
    }
}
