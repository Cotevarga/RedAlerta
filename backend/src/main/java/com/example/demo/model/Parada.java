package com.example.demo.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "paradas")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Parada {

    @Id
    private String id;

    @Column(nullable = false, length = 100)
    private String nombre;

    @Column(name = "tipo_hito", length = 50)
    private String tipoHito;

    @Column(length = 100)
    private String sector;

    @Column(columnDefinition = "TEXT")
    private String notas;

    @Column(name = "offset_minutos", nullable = false)
    private int offsetMinutos;
}
