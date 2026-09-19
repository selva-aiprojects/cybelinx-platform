package com.cybelinx.platform.api.auth;

/** Credentials for the platform email+password login ({@code POST /auth/login}). */
public record LoginRequest(String email, String password) {}