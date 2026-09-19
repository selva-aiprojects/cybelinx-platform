package com.cybelinx.platform.api.regions;

import com.cybelinx.platform.api.products.ProductConstants;
import com.cybelinx.platform.api.security.AuthPrincipal;
import com.cybelinx.platform.api.security.CurrentPrincipal;
import com.cybelinx.platform.api.security.RequirePermissions;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Region catalog REST surface — {@code GET /regions}. */
@RestController
@RequestMapping("/regions")
public class RegionsController {

    private final RegionService regionService;

    public RegionsController(RegionService regionService) {
        this.regionService = regionService;
    }

    @GetMapping
    @RequirePermissions(ProductConstants.PERMISSION_PRODUCT_READ)
    public List<RegionViews.RegionView> listRegions(@CurrentPrincipal AuthPrincipal principal) {
        return regionService.listRegions(principal);
    }
}