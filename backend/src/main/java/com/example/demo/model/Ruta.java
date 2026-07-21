package com.example.demo.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "rutas")
@Data // Genera automáticamente Getters, Setters, toString, equals y hashCode
@NoArgsConstructor // Genera el constructor vacío requerido por JPA
@AllArgsConstructor // Genera un constructor con todos los atributos
public class Ruta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String origen;

    @Column(nullable = false, length = 100)
    private String destino;

    @Column(name = "es_subsidiado")
    private Boolean esSubsidiado = false;

    @Column(name = "tarifa_estimada")
    private Integer tarifaEstimada = 0;
}