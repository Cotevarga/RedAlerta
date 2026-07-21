package com.example.demo.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Base64;
import java.util.Date;

@Component
public class JwtUtil {

    private Key SECRET_KEY;
    
    @Value("${jwt.secret:}")
    private String jwtSecret;

    @Value("${jwt.expiration:36000000}")
    private long EXPIRATION_TIME;

    @PostConstruct
    public void init() {
        if (jwtSecret != null && !jwtSecret.isBlank()) {
            byte[] keyBytes = Base64.getDecoder().decode(jwtSecret);
            SECRET_KEY = Keys.hmacShaKeyFor(keyBytes);
        } else {
            SECRET_KEY = Keys.secretKeyFor(SignatureAlgorithm.HS256);
        }
    }

    /**
     * MÉTODO 1: FABRICAR EL TOKEN
     * Se llama cuando el funcionario de la municipalidad inicia sesión correctamente con su usuario y contraseña.
     */
    public String generarToken(String username) {
        return Jwts.builder()
                .setSubject(username) // A quién le pertenece el token
                .setIssuedAt(new Date(System.currentTimeMillis())) // Fecha de emisión
                .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION_TIME)) // Fecha de vencimiento
                .signWith(SECRET_KEY) // Lo firmamos digitalmente para que nadie lo pueda falsificar
                .compact();
    }

    /**
     * MÉTODO 2: LEER EL TOKEN
     * Extrae el nombre del usuario municipal que viene oculto dentro del token encriptado.
     */
    public String extraerUsername(String token) {
        return extraerClaims(token).getSubject();
    }

    /**
     * MÉTODO 3: VALIDAR EL TOKEN
     * Verifica que el token corresponda al usuario y que no haya caducado por tiempo.
     */
    public boolean validarToken(String token, String username) {
        final String tokenUsername = extraerUsername(token);
        return (tokenUsername.equals(username) && !isTokenExpirado(token));
    }

    // --- Métodos internos de apoyo ---

    private Claims extraerClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(SECRET_KEY)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    private boolean isTokenExpirado(String token) {
        return extraerClaims(token).getExpiration().before(new Date());
    }
}