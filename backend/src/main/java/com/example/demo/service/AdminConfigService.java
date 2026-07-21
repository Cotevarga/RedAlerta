package com.example.demo.service;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class AdminConfigService {

    @Value("${admin.username:adminMuni}")
    private String defaultUsername;

    @Value("${admin.password:Corral2026}")
    private String defaultPassword;

    private String currentUsername;
    private String currentPassword;

    @PostConstruct
    public void init() {
        this.currentUsername = defaultUsername;
        this.currentPassword = defaultPassword;
    }

    public boolean validarCredenciales(String username, String password) {
        return currentUsername.equals(username) && currentPassword.equals(password);
    }

    public boolean cambiarPassword(String username, String oldPassword, String newPassword) {
        if (!validarCredenciales(username, oldPassword)) return false;
        this.currentPassword = newPassword;
        return true;
    }

    public String getCurrentUsername() {
        return currentUsername;
    }
}
