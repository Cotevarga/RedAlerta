package com.example.demo.controller;

import com.example.demo.service.TransporteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController // Indica que esta clase es un controlador REST que retornará respuestas JSON o texto plano
@RequestMapping("/api/transporte") // Define la ruta base de la URL (Ej: http://localhost:8080/api/transporte)
public class TransporteController {

    // Inyectamos el servicio que contiene la lógica analítica de cálculo de tiempos
    @Autowired
    private TransporteService transporteService;

    /**
     * Endpoint REST para consultar el reporte de movilidad de un sector.
     * Acceso mediante HTTP GET: /api/transporte/reporte?sector=Chaihuin&dia=Sabado
     * 
     * @param sector Nombre del paradero o sector a consultar (Parámetro obligatorio)
     * @param dia Día de la semana para filtrar el itinerario (Por defecto será 'Sábado' si no se envía)
     * @return ResponseEntity con el texto estructurado y estado HTTP 200 OK
     */
    @GetMapping("/reporte")
    public ResponseEntity<String> consultarReporte(
            @RequestParam(value = "sector") String sector,
            @RequestParam(value = "dia", defaultValue = "Sábado") String dia) {
        
        // Ejecutamos la lógica de negocio pasando los parámetros de la petición
        String reporteFinal = transporteService.obtenerReporteMovilidad(sector, dia);
        
        // Retornamos el reporte de texto plano listo para ser consumido por WhatsApp o la web
        return ResponseEntity.ok(reporteFinal);
    }
}