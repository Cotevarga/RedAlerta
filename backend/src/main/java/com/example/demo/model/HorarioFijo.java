package com.example.demo.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalTime;

@Entity
@Table(name = "horarios_fijos")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class HorarioFijo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "ruta_id", nullable = false)
    private Ruta ruta; // Relación relacional con la entidad Ruta

    @Column(name = "dia_semana", nullable = false, length = 20)
    private String diaSemana;

    @Column(name = "hora_salida", nullable = false)
    private LocalTime horaSalida; // LocalTime mapea perfectamente el tipo TIME de PostgreSQL
}