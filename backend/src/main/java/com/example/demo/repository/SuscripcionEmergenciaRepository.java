package com.example.demo.repository;

import com.example.demo.model.Ruta;
import com.example.demo.model.SuscripcionEmergencia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SuscripcionEmergenciaRepository extends JpaRepository<SuscripcionEmergencia, Long> {
    
    // Encuentra todos los números de WhatsApp inscritos a una ruta con problemas viales
    List<SuscripcionEmergencia> findByRuta(Ruta r);
    
    // Verifica si un número ya se encuentra suscrito para evitar duplicados en la base de datos
    boolean existsByNumeroWhatsappAndRuta(String numero, Ruta r);
    
    // Borra la suscripción una vez que expira la ventana de tiempo del viaje
    void deleteByNumeroWhatsapp(String numero);
}