package com.example.demo.controller;

import com.example.demo.service.WhatsAppStatusService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
public class WhatsAppController {

    @Autowired
    private WhatsAppStatusService whatsAppStatusService;

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
}
