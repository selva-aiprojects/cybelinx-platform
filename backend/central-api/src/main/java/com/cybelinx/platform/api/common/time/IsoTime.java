package com.cybelinx.platform.api.common.time;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

/** ISO-8601 UTC serialization matching {@code Date.toISOString()}. */
public final class IsoTime {

    private static final DateTimeFormatter TO_ISO =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");

    private IsoTime() {}

    public static String format(LocalDateTime value) {
        return value == null ? null : value.atZone(ZoneOffset.UTC).format(TO_ISO);
    }

    public static String nowIso() {
        return format(LocalDateTime.now(ZoneOffset.UTC));
    }

    /**
     * Parse an ISO-8601 string (with or without millis) into a UTC {@link LocalDateTime}.
     * Throws {@link DateTimeParseException} if the string cannot be parsed.
     */
    public static LocalDateTime parse(String iso) {
        if (iso == null || iso.isBlank()) {
            throw new DateTimeParseException("Cannot parse null/blank ISO string", iso != null ? iso : "", 0);
        }
        // Try full millis format first, then without millis
        try {
            return LocalDateTime.parse(iso.replace("Z", ""), DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS"));
        } catch (DateTimeParseException e1) {
            try {
                return LocalDateTime.parse(iso.replace("Z", ""), DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss"));
            } catch (DateTimeParseException e2) {
                return LocalDateTime.parse(iso.replace("Z", ""), DateTimeFormatter.ISO_LOCAL_DATE_TIME);
            }
        }
    }
}