package com.example.demo.controller;

import com.example.demo.security.JwtUtil;
import com.example.demo.service.AdminConfigService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private AdminConfigService adminConfigService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credenciales) {
        String usuario = credenciales.get("username");
        String password = credenciales.get("password");

        if (adminConfigService.validarCredenciales(usuario, password)) {
            String tokenGenerado = jwtUtil.generarToken(usuario);
            Map<String, String> respuesta = new HashMap<>();
            respuesta.put("token", tokenGenerado);
            return ResponseEntity.ok(respuesta);
        } else {
            return ResponseEntity.status(401).body("Credenciales inválidas");
        }
    }
}
