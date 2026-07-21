package com.example.demo.service;

import com.example.demo.model.Parada;
import com.example.demo.repository.ParadaRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class BusCalculationService {

    @Autowired
    private ParadaRepository paradaRepository;

    private final Map<String, Integer> offsets = new HashMap<>();

    @PostConstruct
    public void init() {
        List<Parada> paradas = paradaRepository.findAll();
        for (Parada p : paradas) {
            offsets.put(p.getId(), p.getOffsetMinutos());
        }
    }

    public int getOffset(String paradaId) {
        return offsets.getOrDefault(paradaId, 0);
    }

    public String calcularHoraLlegada(String paradaId, String horaSalidaStr) {
        int offset = getOffset(paradaId);
        LocalTime horaSalida = LocalTime.parse(horaSalidaStr);
        LocalTime horaLlegada = horaSalida.plusMinutes(offset);
        return horaLlegada.toString();
    }

    public String calcularHoraAlerta(String paradaId, String horaSalidaStr) {
        int offset = getOffset(paradaId);
        int alertaOffset = Math.max(0, offset - 8);
        LocalTime horaSalida = LocalTime.parse(horaSalidaStr);
        LocalTime horaAlerta = horaSalida.plusMinutes(alertaOffset);
        return horaAlerta.toString();
    }

    public boolean faltan8Minutos(String paradaId, String horaSalidaStr, LocalTime horaActual) {
        int offset = getOffset(paradaId);
        LocalTime horaSalida = LocalTime.parse(horaSalidaStr);
        LocalTime horaLlegada = horaSalida.plusMinutes(offset);
        LocalTime horaAlerta = horaLlegada.minusMinutes(8);

        return !horaActual.isBefore(horaAlerta) && horaActual.isBefore(horaLlegada);
    }

    public Map<String, Object> getInfoCompletaParada(String paradaId, String horaSalidaStr) {
        Map<String, Object> info = new HashMap<>();
        info.put("paradaId", paradaId);
        info.put("offsetMinutos", getOffset(paradaId));
        info.put("horaSalidaTerminal", horaSalidaStr);
        info.put("horaLlegadaEstimada", calcularHoraLlegada(paradaId, horaSalidaStr));
        info.put("horaAlerta8Minutos", calcularHoraAlerta(paradaId, horaSalidaStr));
        return info;
    }

    public List<Parada> getTodasLasParadas() {
        return paradaRepository.findAllByOrderByOffsetMinutosAsc();
    }
}
