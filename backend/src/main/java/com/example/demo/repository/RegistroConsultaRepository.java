package com.example.demo.repository;

import com.example.demo.model.RegistroConsulta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface RegistroConsultaRepository extends JpaRepository<RegistroConsulta, Long> {
    long countByTipo(String tipo);
    List<RegistroConsulta> findTop50ByOrderByFechaConsultaDesc();
}
