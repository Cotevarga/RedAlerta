package com.example.demo.DTO;

import lombok.Data;

@Data
public class IncidenteRequestDTO {
    private Long rutaId;
    private String tipoIncidente;
    private String descripcion;
}