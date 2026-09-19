package com.cybelinx.platform.api.regions;

import com.cybelinx.platform.api.persistence.RegionRepository;
import com.cybelinx.platform.api.products.ProductConstants;
import com.cybelinx.platform.api.security.AuthPrincipal;
import com.cybelinx.platform.api.security.AuthorizationService;
import com.cybelinx.platform.shared.ApiError;
import com.cybelinx.platform.shared.ErrorCode;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Region catalog service. */
@Service
public class RegionService {

    private final RegionRepository regions;
    private final AuthorizationService authorization;

    public RegionService(RegionRepository regions, AuthorizationService authorization) {
        this.regions = regions;
        this.authorization = authorization;
    }

    @Transactional(readOnly = true)
    public List<RegionViews.RegionView> listRegions(AuthPrincipal principal) {
        assertPlatformPermission(principal.user().id(), ProductConstants.PERMISSION_PRODUCT_READ);
        return regions.findAll(Sort.by(Sort.Direction.ASC, "name")).stream()
                .map(region -> new RegionViews.RegionView(
                        region.getId().toString(), region.getRegionCode(), region.getName(), region.getProvider()))
                .toList();
    }

    private void assertPlatformPermission(UUID userId, String permission) {
        boolean granted = authorization.listAccess(userId).stream()
                .anyMatch(entry -> entry.roles().contains(AuthorizationService.PLATFORM_ADMIN_ROLE)
                        || entry.permissions().contains(permission));
        if (!granted) {
            throw new ApiError(
                    ErrorCode.FORBIDDEN,
                    "Missing required permission: " + permission,
                    Map.of("permission", permission));
        }
    }
}