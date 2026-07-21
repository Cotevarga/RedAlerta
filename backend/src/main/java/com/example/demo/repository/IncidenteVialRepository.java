package com.example.demo.repository;

import com.example.demo.model.IncidenteVial;
import com.example.demo.model.Ruta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface IncidenteVialRepository extends JpaRepository<IncidenteVial, Long> {
    
    // Filtra las alertas viales que siguen activas (Ej: derrumbes que aún no limpia la maquinaria)
    // SELECT * FROM incidentes_viales WHERE estado = 'Activo'
    List<IncidenteVial> findByEstado(String estado);
    
    // Encuentra incidentes activos asociados a una ruta de tránsito específica
    List<IncidenteVial> findByRutaAndEstado(Ruta r, String estado);
}