package com.example.demo.repository;

import com.example.demo.model.Ruta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

// @Repository le indica a Spring Boot que este componente maneja el acceso a los datos
@Repository
public interface RutaRepository extends JpaRepository<Ruta, Long> {
    
    // Método personalizado: Spring Data JPA creará automáticamente la consulta SQL interna
    // SELECT * FROM rutas WHERE origen = ? OR destino = ?
    List<Ruta> findByOrigenContainingIgnoreCaseOrDestinoContainingIgnoreCase(String origen, String destino);
}