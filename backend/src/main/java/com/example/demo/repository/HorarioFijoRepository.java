package com.example.demo.repository;

import com.example.demo.model.HorarioFijo;
import com.example.demo.model.Ruta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface HorarioFijoRepository extends JpaRepository<HorarioFijo, Long> {
    
    // Busca todos los horarios fijos de una ruta específica y los ordena cronológicamente por hora de salida
    // SELECT * FROM horarios_fijos WHERE ruta_id = ? ORDER BY hora_salida ASC
    List<HorarioFijo> findByRutaOrderByHoraSalidaAsc(Ruta r);
    
    // Filtra los horarios por ruta y por el día de la semana actual (Ej: 'Sábado')
    List<HorarioFijo> findByRutaAndDiaSemanaOrderByHoraSalidaAsc(Ruta r, String diaSemana);
}