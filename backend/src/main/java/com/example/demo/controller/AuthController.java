package com.example.demo.controller;

import com.example.demo.security.JwtUtil;
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

    // Endpoint POST para iniciar sesión: /api/auth/login
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credenciales) {
        
        String usuario = credenciales.get("username");
        String password = credenciales.get("password");

        // VALIDACIÓN HARDCODEADA (Solo para efectos de desarrollo/demostración)
        // Como Técnico Analista Programador sabes que luego esto se conecta a una tabla de Usuarios en la BD
        if ("adminMuni".equals(usuario) && "Corral2026".equals(password)) {
            
            // Si las credenciales son correctas, generamos el pase VIP
            String tokenGenerado = jwtUtil.generarToken(usuario);
            
            // Devolvemos el token en formato JSON
            Map<String, String> respuesta = new HashMap<>();
            respuesta.put("token", tokenGenerado);
            
            return ResponseEntity.ok(respuesta);
        } else {
            // Si se equivocan de clave, devolvemos un error 401 No Autorizado
            return ResponseEntity.status(401).body("Credenciales inválidas");
        }
    }
}