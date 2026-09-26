package com.stocksense.controller;

import com.stocksense.service.AuthService;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Map;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import jakarta.servlet.http.HttpServletRequest;

@Validated
@RestController
@RequestMapping("/api/auth")
public class AuthController {
    public record SignUpRequest(@NotBlank String fullName, @Email @NotBlank String email, @Size(min = 8) String password) { }
    public record SignInRequest(@Email @NotBlank String email, @NotBlank String password) { }
    public record ResetRequest(@Email @NotBlank String email) { }
    public record ConfirmResetRequest(@Email @NotBlank String email, @NotBlank String code, @Size(min = 8) String newPassword) { }
    private final AuthService auth;
    public AuthController(AuthService auth) { this.auth = auth; }
    @PostMapping("/signup") public Map<String, Object> signUp(@RequestBody SignUpRequest request) { return auth.signUp(request.fullName(), request.email(), request.password()); }
    @PostMapping("/login") public Map<String, Object> signIn(@RequestBody SignInRequest request) { return auth.signIn(request.email(), request.password()); }
    @PostMapping("/password-reset/request") public Map<String, Object> requestReset(@RequestBody ResetRequest request) { return auth.requestReset(request.email()); }
    @PostMapping("/password-reset/confirm") public Map<String, String> confirmReset(@RequestBody ConfirmResetRequest request) { return auth.resetPassword(request.email(), request.code(), request.newPassword()); }
    @PostMapping("/logout") public Map<String, String> logout(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        auth.logout(header != null && header.startsWith("Bearer ") ? header.substring(7) : null);
        return Map.of("message", "Signed out");
    }
}