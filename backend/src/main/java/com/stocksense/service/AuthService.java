package com.stocksense.service;

import com.stocksense.domain.UserAccount;
import com.stocksense.repository.UserAccountRepository;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {
    private record ResetCode(String value, Instant expiresAt) { }
    private record AuthSession(String email, Instant expiresAt) { }
    private final UserAccountRepository users;
    private final PasswordEncoder passwords;
    private final Map<String, AuthSession> sessions = new ConcurrentHashMap<>();
    private final Map<String, ResetCode> resetCodes = new ConcurrentHashMap<>();
    private final SecureRandom random = new SecureRandom();
    @Value("${stocksense.auth.expose-reset-otp:true}") private boolean exposeResetOtp;

    public AuthService(UserAccountRepository users, PasswordEncoder passwords) { this.users = users; this.passwords = passwords; }

    public Map<String, Object> signUp(String fullName, String email, String password) {
        String normalizedEmail = normalizeEmail(email);
        if (fullName == null || fullName.isBlank() || password == null || password.length() < 8) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Name is required and password must have at least 8 characters");
        }
        if (users.existsByEmailIgnoreCase(normalizedEmail)) throw new ResponseStatusException(HttpStatus.CONFLICT, "An account already exists for this email");
        return session(users.save(new UserAccount(fullName.trim(), normalizedEmail, passwords.encode(password))));
    }

    public Map<String, Object> signIn(String email, String password) {
        UserAccount user = users.findByEmailIgnoreCase(normalizeEmail(email)).orElse(null);
        if (user == null || !passwords.matches(password == null ? "" : password, user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Email or password is incorrect");
        }
        return session(user);
    }

    public Map<String, Object> requestReset(String email) {
        String normalizedEmail = normalizeEmail(email);
        UserAccount user = users.findByEmailIgnoreCase(normalizedEmail).orElse(null);
        Map<String, Object> result = new java.util.HashMap<>();
        result.put("message", "If that account exists, a reset code has been sent.");
        if (user != null) {
            String code = "%06d".formatted(random.nextInt(1_000_000));
            resetCodes.put(normalizedEmail, new ResetCode(code, Instant.now().plusSeconds(600)));
            if (exposeResetOtp) result.put("demoOtp", code);
        }
        return result;
    }

    public Map<String, String> resetPassword(String email, String code, String newPassword) {
        String normalizedEmail = normalizeEmail(email);
        ResetCode stored = resetCodes.get(normalizedEmail);
        if (stored == null || !stored.expiresAt().isAfter(Instant.now()) || !stored.value().equals(code)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The reset code is invalid or expired");
        }
        if (newPassword == null || newPassword.length() < 8) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must have at least 8 characters");
        UserAccount user = users.findByEmailIgnoreCase(normalizedEmail).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "The reset code is invalid or expired"));
        user.setPasswordHash(passwords.encode(newPassword));
        users.save(user);
        resetCodes.remove(normalizedEmail);
        return Map.of("message", "Password updated. Sign in with your new password.");
    }

    public boolean isValidSession(String token) {
        AuthSession session = sessions.get(token);
        if (session == null) return false;
        if (session.expiresAt().isAfter(Instant.now())) return true;
        sessions.remove(token);
        return false;
    }

    public void logout(String token) { if (token != null) sessions.remove(token); }

    private Map<String, Object> session(UserAccount user) {
        String token = UUID.randomUUID().toString();
        sessions.put(token, new AuthSession(user.getEmail(), Instant.now().plusSeconds(43_200)));
        return Map.of("accessToken", token, "user", Map.of("id", user.getId(), "fullName", user.getFullName(), "email", user.getEmail(), "role", user.getRole()));
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required");
        return email.trim().toLowerCase();
    }
}