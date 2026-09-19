package com.cybelinx.platform.api.common.ratelimit;

import com.cybelinx.platform.api.common.error.ApiHttpException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Lightweight in-memory sliding-window rate limiter keyed by client IP. Guards API routes against
 * accidental bursts and brute-force attempts; over budget requests fail fast with {@code 429}.
 */
@Component
public class RateLimitInterceptor implements HandlerInterceptor {

    private final boolean enabled;
    private final int requestsPerWindow;
    private final long windowSeconds;

    private final Map<String, Deque<Long>> windows = new ConcurrentHashMap<>();

    public RateLimitInterceptor(
            @Value("${cybelinx.rate-limit.enabled:true}") boolean enabled,
            @Value("${cybelinx.rate-limit.requests-per-window:300}") int requestsPerWindow,
            @Value("${cybelinx.rate-limit.window-seconds:60}") long windowSeconds) {
        this.enabled = enabled;
        this.requestsPerWindow = requestsPerWindow;
        this.windowSeconds = windowSeconds;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!enabled || requestsPerWindow <= 0) {
            return true;
        }
        String clientKey = clientKey(request);
        long now = Instant.now().toEpochMilli();
        long windowStart = now - windowSeconds * 1000L;

        Deque<Long> timestamps = windows.computeIfAbsent(clientKey, k -> new ArrayDeque<>());
        synchronized (timestamps) {
            while (!timestamps.isEmpty() && timestamps.peekFirst() < windowStart) {
                timestamps.pollFirst();
            }
            if (timestamps.size() >= requestsPerWindow) {
                response.setHeader("Retry-After", String.valueOf(windowSeconds));
                throw ApiHttpException.tooManyRequests(
                        "Too many requests. Please retry in " + windowSeconds + " seconds.");
            }
            timestamps.addLast(now);
        }
        return true;
    }

    private String clientKey(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",", 2)[0].trim();
        }
        String remote = request.getRemoteAddr();
        return remote == null ? "unknown" : remote;
    }
}