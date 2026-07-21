package com.example.demo.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

@Service
public class KeepAliveService {

    private final HttpClient client = HttpClient.newHttpClient();

    @Value("${app.render-url:}")
    private String renderUrl;

    @Scheduled(fixedRate = 480000)
    public void mantenerDespierto() {
        if (renderUrl == null || renderUrl.isBlank()) return;

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(renderUrl + "/api/transporte/reporte?sector=Corral&dia=Lunes"))
                    .GET()
                    .build();
            client.send(request, HttpResponse.BodyHandlers.discarding());
            System.out.println("🔄 Keep-alive: backend notificado exitosamente.");
        } catch (Exception e) {
            System.out.println("⚠️ Keep-alive: " + e.getMessage());
        }
    }
}
