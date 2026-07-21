package com.example.demo.service;

import com.example.demo.model.Parada;
import com.example.demo.repository.ParadaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import jakarta.annotation.PostConstruct;

@Service
public class SeedService {

    @Autowired
    private ParadaRepository paradaRepository;

    @PostConstruct
    public void seedParadas() {
        if (paradaRepository.count() > 0) return;

        paradaRepository.save(new Parada("P01", "Terminal Rural Corral", "Terminal", "Calle Rancagua", "Punto de salida regulado.", 0));
        paradaRepository.save(new Parada("P02", "La Aguada", "Residencial / Colegio", "Ruta T-450", "Alta demanda en horarios escolares.", 5));
        paradaRepository.save(new Parada("P03", "Cruce Amargos", "Bifurcación", "Ruta T-450", "Entrada al sector Amargos.", 10));
        paradaRepository.save(new Parada("P04", "San Carlos", "Localidad", "Ruta T-450", "Zona residencial costera.", 15));
        paradaRepository.save(new Parada("P05", "Los Liles", "Localidad", "Ruta T-450", "Parada a petición del pasajero.", 22));
        paradaRepository.save(new Parada("P06", "Palo Muerto", "Localidad", "Ruta T-450", "Parada a petición del pasajero.", 28));
        paradaRepository.save(new Parada("P07", "Huape", "Turístico / Gastronómico", "Ruta T-450", "Alta demanda fines de semana.", 35));
        paradaRepository.save(new Parada("P08", "Chaihuín Pueblo", "Balneario / Comercio", "Entrada a Chaihuín", "Detención principal intermedia.", 45));
        paradaRepository.save(new Parada("P09", "Reserva Costera", "Control / Parque", "Pasado Puente Chaihuín", "Flujo constante de turistas.", 52));
        paradaRepository.save(new Parada("P10", "Kamañ Mapu", "Comunidad", "Ruta Interior", "Parada a petición / Turismo.", 60));
        paradaRepository.save(new Parada("P11", "Huiro", "Terminal Final", "Sector Huiro Costero", "Punto de retorno del bus.", 70));
    }
}
