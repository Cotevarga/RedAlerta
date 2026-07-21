package com.example.demo.repository;

import com.example.demo.model.RegistroConsulta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface RegistroConsultaRepository extends JpaRepository<RegistroConsulta, Long> {
    long countByTipo(String tipo);

    @Query("SELECT COUNT(r) FROM RegistroConsulta r WHERE r.tipo = :tipo AND r.fechaConsulta >= :desde")
    long countByTipoAndFechaAfter(@Param("tipo") String tipo, @Param("desde") LocalDateTime desde);

    List<RegistroConsulta> findTop50ByOrderByFechaConsultaDesc();
}
