package com.example.demo.repository;

import com.example.demo.model.Parada;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ParadaRepository extends JpaRepository<Parada, String> {
    List<Parada> findAllByOrderByOffsetMinutosAsc();
}
