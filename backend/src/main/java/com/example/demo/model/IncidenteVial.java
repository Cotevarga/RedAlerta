package com.example.demo.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "incidentes_viales")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class IncidenteVial {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "ruta_id", nullable = false)
    private Ruta ruta;

    @Column(name = "tipo_incidente", nullable = false, length = 50)
    private String tipoIncidente; // Ej: 'Derrumbe', 'Árbol Caído'

    @Column(columnDefinition = "TEXT")
    private String descripcion;

    @Column(name = "fecha_reporte", updatable = false)
    private LocalDateTime fechaReporte = LocalDateTime.now();

    @Column(nullable = false, length = 20)
    private String estado = "Activo"; // 'Activo' o 'Solucionado'
}