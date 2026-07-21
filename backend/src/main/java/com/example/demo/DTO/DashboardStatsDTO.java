package com.example.demo.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class DashboardStatsDTO {
    private long busesActivos;
    private long consultasHoy;
    private long incidentesActivos;
    private long sectoresConectados;
    private long totalIncidentes;
    private long totalHorarios;
}
