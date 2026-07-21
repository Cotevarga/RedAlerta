package com.example.demo.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class KeepAliveService {

    private final RestTemplate restTemplate;

    @Value("${app.render-url:}")
    private String renderUrl;

    public KeepAliveService(RestTemplateBuilder builder) {
        this.restTemplate = builder.build();
    }

    @Scheduled(fixedRate = 480000)
    public void mantenerDespierto() {
        if (renderUrl == null || renderUrl.isBlank()) return;

        try {
            restTemplate.getForEntity(renderUrl + "/api/transporte/reporte?sector=Corral&dia=Lunes", String.class);
            System.out.println("🔄 Keep-alive: backend notificado exitosamente.");
        } catch (Exception e) {
            System.out.println("⚠️ Keep-alive: " + e.getMessage());
        }
    }
}
