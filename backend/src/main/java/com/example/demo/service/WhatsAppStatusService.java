package com.example.demo.service;

import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class WhatsAppStatusService {

    private String numero = "No configurado";
    private String status = "DISCONNECTED";
    private String qr = "";
    private long lastUpdate = 0;

    public void actualizar(String numero, String status, String qr) {
        this.numero = numero;
        this.status = status;
        this.qr = qr != null ? qr : "";
        this.lastUpdate = System.currentTimeMillis();
    }

    public Map<String, Object> getEstado() {
        Map<String, Object> estado = new HashMap<>();
        estado.put("numero", numero);
        estado.put("status", status);
        estado.put("qr", qr);
        estado.put("lastUpdate", lastUpdate);
        return estado;
    }

    public boolean isConnected() {
        return "CONNECTED".equals(status);
    }
}
