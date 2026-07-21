package com.example.demo.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "registros_consultas")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RegistroConsulta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "numero_whatsapp", length = 20)
    private String numeroWhatsapp;

    @Column(length = 100)
    private String sector;

    @Column(columnDefinition = "TEXT")
    private String mensaje;

    @Column(length = 30)
    private String tipo;

    @Column(name = "fecha_consulta", updatable = false)
    private LocalDateTime fechaConsulta = LocalDateTime.now();
}
