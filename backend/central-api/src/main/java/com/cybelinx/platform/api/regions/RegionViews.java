package com.cybelinx.platform.api.regions;

/** Response contract for {@code GET /regions}. */
public final class RegionViews {

    public record RegionView(String regionId, String regionCode, String name, String provider) {}

    private RegionViews() {
    }
}