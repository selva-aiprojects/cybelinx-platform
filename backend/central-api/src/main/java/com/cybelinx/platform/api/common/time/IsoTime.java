package com.cybelinx.platform.api.common.time;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

/** ISO-8601 UTC serialization matching {@code Date.toISOString()}. */
public final class IsoTime {

    private static final DateTimeFormatter TO_ISO = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");

    private IsoTime() {
    }

    public static String format(LocalDateTime value) {
        return value == null ? null : value.atZone(ZoneOffset.UTC).format(TO_ISO);
    }

    public static String nowIso() {
        return format(LocalDateTime.now(ZoneOffset.UTC));
    }
}