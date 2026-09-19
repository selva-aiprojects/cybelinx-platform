package com.cybelinx.platform.api.auth;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public admin-portal login. Not covered by {@code TenantAuthInterceptor} (no bearer token yet), so
 * this route is open; Spring Security's chain is permissive by design.
 */
@RestController
@RequestMapping("/auth")
public class LoginController {

    private final LoginService loginService;

    public LoginController(LoginService loginService) {
        this.loginService = loginService;
    }

    @PostMapping("/login")
    public LoginResponse login(@RequestBody LoginRequest request) {
        return loginService.login(request);
    }
}