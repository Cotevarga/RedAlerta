package com.example.demo.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;

@Component
public class JwtRequestFilter extends OncePerRequestFilter {

    @Autowired
    private JwtUtil jwtUtil;

    private static final String[] PUBLIC_PATHS = {
        "/api/transporte/", "/api/auth/", "/api/admin/incidentes",
        "/api/whatsapp/", "/api/emergencia/", "/api/emergencias"
    };

    private boolean esPublico(String path) {
        for (String p : PUBLIC_PATHS) {
            if (path.startsWith(p)) return true;
        }
        return false;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        String path = request.getRequestURI();
        if ("OPTIONS".equalsIgnoreCase(request.getMethod()) || esPublico(path)) {
            chain.doFilter(request, response);
            return;
        }

        final String authorizationHeader = request.getHeader("Authorization");

        String username = null;
        String jwt = null;

        // El estándar indica que el token debe venir acompañado de la palabra "Bearer "
        if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
            jwt = authorizationHeader.substring(7);
            try {
                username = jwtUtil.extraerUsername(jwt);
            } catch (Exception e) {
                System.out.println("Error extrayendo el token JWT: " + e.getMessage());
            }
        }

        // Si encontramos un usuario y el sistema aún no lo ha validado en esta petición
        if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {

            if (jwtUtil.validarToken(jwt, username)) {
                // Creamos el "Pase VIP" oficial para Spring Security
                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                        username, null, new ArrayList<>());
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                
                // Le decimos a Spring Security: "Déjalo pasar, está autorizado"
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        }
        
        // El guardia abre la puerta y deja que la petición continúe su camino
        chain.doFilter(request, response);
    }
}