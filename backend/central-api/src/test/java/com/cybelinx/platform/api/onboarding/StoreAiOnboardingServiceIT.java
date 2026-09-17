package com.cybelinx.platform.api.onboarding;

import com.cybelinx.platform.api.onboarding.StoreAiOnboardingViews.BatchStoreOnboardRequest;
import com.cybelinx.platform.api.onboarding.StoreAiOnboardingViews.BatchStoreOnboardResponse;
import com.cybelinx.platform.api.onboarding.StoreAiOnboardingViews.NewStoreSignupRequest;
import com.cybelinx.platform.api.onboarding.StoreAiOnboardingViews.SingleStoreOnboardRequest;
import com.cybelinx.platform.api.onboarding.StoreAiOnboardingViews.StoreAiOnboardingResponse;
import com.cybelinx.platform.api.onboarding.StoreAiOnboardingViews.StoreOnboardStatusView;
import com.cybelinx.platform.api.persistence.MembershipRoleRepository;
import com.cybelinx.platform.api.persistence.RoleRepository;
import com.cybelinx.platform.api.persistence.TenantExternalIdentifierRepository;
import com.cybelinx.platform.api.persistence.TenantMembershipRepository;
import com.cybelinx.platform.api.persistence.TenantProductRepository;
import com.cybelinx.platform.api.persistence.TenantRepository;
import com.cybelinx.platform.api.persistence.TenantResourceRepository;
import com.cybelinx.platform.api.persistence.UserRepository;
import com.cybelinx.platform.api.persistence.entity.Tenant;
import com.cybelinx.platform.api.persistence.entity.TenantExternalIdentifier;
import com.cybelinx.platform.api.persistence.entity.TenantResource;
import com.cybelinx.platform.api.security.AuthPrincipal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class StoreAiOnboardingServiceIT {

    @Autowired
    private StoreAiOnboardingService storeAiOnboardingService;

    @Autowired
    private TenantRepository tenantRepository;

    @Autowired
    private TenantExternalIdentifierRepository externalIdRepository;

    @Autowired
    private TenantProductRepository tenantProductRepository;

    @Autowired
    private TenantResourceRepository tenantResourceRepository;

    @Autowired private UserRepository userRepository;
    @Autowired private TenantMembershipRepository membershipRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private MembershipRoleRepository membershipRoleRepository;

    private AuthPrincipal adminPrincipal;

    @BeforeEach
    void setUp() {
        com.cybelinx.platform.api.persistence.entity.User adminUser = new com.cybelinx.platform.api.persistence.entity.User();
        adminUser.setEmail("storeai-admin-" + UUID.randomUUID() + "@cybelinx.com");
        adminUser.setDisplayName("StoreAI Platform Admin");
        adminUser = userRepository.save(adminUser);

        Tenant sysTenant = new Tenant();
        sysTenant.setTenantCode("sys-storeai-" + UUID.randomUUID().toString().substring(0, 6));
        sysTenant.setName("System Tenant");
        sysTenant = tenantRepository.save(sysTenant);

        com.cybelinx.platform.api.persistence.entity.TenantMembership sysMembership = new com.cybelinx.platform.api.persistence.entity.TenantMembership();
        sysMembership.setTenant(sysTenant);
        sysMembership.setUser(adminUser);
        sysMembership.setStatus(com.cybelinx.platform.api.domain.MembershipStatus.ACTIVE);
        sysMembership = membershipRepository.save(sysMembership);

        com.cybelinx.platform.api.persistence.entity.Role adminRole = roleRepository.findByCode(com.cybelinx.platform.api.tenants.TenantConstants.PLATFORM_ADMIN_ROLE).orElseGet(() -> {
            com.cybelinx.platform.api.persistence.entity.Role r = new com.cybelinx.platform.api.persistence.entity.Role();
            r.setCode(com.cybelinx.platform.api.tenants.TenantConstants.PLATFORM_ADMIN_ROLE);
            r.setName("Platform Admin");
            r.setScope(com.cybelinx.platform.api.domain.RoleScope.PLATFORM);
            return roleRepository.save(r);
        });

        com.cybelinx.platform.api.persistence.entity.MembershipRole mr = new com.cybelinx.platform.api.persistence.entity.MembershipRole();
        mr.setMembership(sysMembership);
        mr.setRole(adminRole);
        membershipRoleRepository.save(mr);

        AuthPrincipal.AuthUser authAdminUser = new AuthPrincipal.AuthUser(
                adminUser.getId(), adminUser.getEmail(), adminUser.getDisplayName(), "ACTIVE", "en", "UTC");
        AuthPrincipal.AuthIdentity authAdminIdent = new AuthPrincipal.AuthIdentity(
                "generic", "sub-admin-" + adminUser.getId(), adminUser.getEmail(), adminUser.getDisplayName());
        adminPrincipal = new AuthPrincipal(authAdminUser, authAdminIdent);
    }

    @Test
    void onboardSingleStore_shouldProvisionTenantAndExternalMapping() {
        String extId = "STOREAI_NEXUS_RETAIL_01";
        SingleStoreOnboardRequest request = new SingleStoreOnboardRequest(
                extId,
                "Nike Flagship Store",
                "STOREAI_NIKE_01",
                "STOREAI_ENTERPRISE",
                "https://nike.storeai.com",
                "merchant@nike.com",
                "seed-dev-admin-0001",
                "SCHEMA_PER_TENANT",
                "PRODUCTION",
                "storeai_nike_01"
        );

        StoreAiOnboardingResponse response = storeAiOnboardingService.onboardExistingStore(adminPrincipal, request);

        assertThat(response).isNotNull();
        assertThat(response.status()).isEqualTo("SUCCESS");
        assertThat(response.tenantCode()).isEqualTo("STOREAI_NIKE_01");
        assertThat(response.externalId()).isEqualTo(extId);

        Optional<Tenant> tenantOpt = tenantRepository.findByTenantCode("STOREAI_NIKE_01");
        assertThat(tenantOpt).isPresent();

        List<TenantExternalIdentifier> mappings = externalIdRepository.findByTenant_Id(tenantOpt.get().getId());
        assertThat(mappings).hasSize(1);
        assertThat(mappings.get(0).getExternalId()).isEqualTo(extId);

        assertThat(tenantProductRepository.findByTenantIdAndProductId(tenantOpt.get().getId(), mappings.get(0).getProduct().getId())).isPresent();
        assertThat(tenantResourceRepository.listByTenantId(tenantOpt.get().getId())).isNotEmpty();
        List<TenantResource> resources = tenantResourceRepository.listByTenantId(tenantOpt.get().getId());
        assertThat(resources).anyMatch(r -> r.getProduct().getId().equals(mappings.get(0).getProduct().getId()));

        com.cybelinx.platform.api.persistence.entity.User merchant =
                userRepository.findByEmail("merchant@nike.com").orElseThrow();
        com.cybelinx.platform.api.persistence.entity.TenantMembership membership =
                membershipRepository.findByTenant_IdAndUser_Id(tenantOpt.get().getId(), merchant.getId()).orElseThrow();
        assertThat(membershipRoleRepository.findByMembership_Id(membership.getId()))
                .anyMatch(mr -> mr.getRole().getCode()
                        .equals(com.cybelinx.platform.api.tenants.TenantConstants.TENANT_ADMIN_ROLE));
    }

    @Test
    void onboardSingleStore_idempotentSecondCall_shouldReturnAlreadyOnboarded() {
        String extId = "STOREAI_NEXUS_RETAIL_02";
        SingleStoreOnboardRequest request = new SingleStoreOnboardRequest(
                extId,
                "Adidas Store",
                "STOREAI_ADIDAS_01",
                "STOREAI_ENTERPRISE",
                "https://adidas.storeai.com",
                "merchant@adidas.com",
                "seed-dev-admin-0001",
                "SCHEMA_PER_TENANT",
                "PRODUCTION",
                "storeai_adidas_01"
        );

        StoreAiOnboardingResponse resp1 = storeAiOnboardingService.onboardExistingStore(adminPrincipal, request);
        assertThat(resp1.status()).isEqualTo("SUCCESS");

        StoreAiOnboardingResponse resp2 = storeAiOnboardingService.onboardExistingStore(adminPrincipal, request);
        assertThat(resp2.status()).isEqualTo("ALREADY_ONBOARDED");
    }

    @Test
    void onboardBatch_shouldOnboardMultipleStoresInOnePayload() {
        SingleStoreOnboardRequest s1 = new SingleStoreOnboardRequest("STORE_BATCH_01", "Store One", "STORE_ONE_01", "STOREAI_ENTERPRISE", null, null, null, null, null, "store_one");
        SingleStoreOnboardRequest s2 = new SingleStoreOnboardRequest("STORE_BATCH_02", "Store Two", "STORE_TWO_02", "STOREAI_ENTERPRISE", null, null, null, null, null, "store_two");
        BatchStoreOnboardRequest batchReq = new BatchStoreOnboardRequest(List.of(s1, s2));

        BatchStoreOnboardResponse resp = storeAiOnboardingService.onboardBatch(adminPrincipal, batchReq);

        assertThat(resp.totalProcessed()).isEqualTo(2);
        assertThat(resp.succeeded()).isEqualTo(2);
        assertThat(resp.failed()).isZero();
    }

    @Test
    void signupNewStore_shouldProvisionSelfServiceStore() {
        NewStoreSignupRequest request = new NewStoreSignupRequest("STORE_PUMA_01", "Puma Retail", "puma@merchant.com", "STOREAI_ENTERPRISE", "ap-south-1", "IN");

        StoreAiOnboardingResponse response = storeAiOnboardingService.signupNewStore(adminPrincipal, request);

        assertThat(response).isNotNull();
        assertThat(response.status()).isEqualTo("SUCCESS");
        assertThat(response.tenantCode()).isEqualTo("STORE_PUMA_01");

        StoreOnboardStatusView status = storeAiOnboardingService.getOnboardingStatusByExternalId(adminPrincipal, response.externalId());
        assertThat(status).isNotNull();
        assertThat(status.tenantCode()).isEqualTo("STORE_PUMA_01");
    }
}
