package com.example.demo.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;

@Component // Esta anotación le dice a Spring que puede inyectar esta clase donde la necesitemos
public class JwtUtil {

    // Generamos una clave secreta robusta de 256 bits automáticamente
    // (En un entorno de producción real, esto se lee desde el archivo application.properties)
    private static final Key SECRET_KEY = Keys.secretKeyFor(SignatureAlgorithm.HS256);
    
    // Definimos la duración del token (Ej: 10 horas de jornada laboral para el operario municipal)
    private static final long EXPIRATION_TIME = 1000 * 60 * 60 * 10;

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