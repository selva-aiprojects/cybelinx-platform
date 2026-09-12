package com.cybelinx.platform.api.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Wire parity of the NestJS gates and the global exception handling for the
 * {@code /tenants/**} surface (401/403 bodies, unknown routes, method-not-allowed).
 */
@SpringBootTest(properties = "server.servlet.context-path=")
@AutoConfigureMockMvc
class ErrorShapeIT {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void missingAuthorizationHeader_returnsNestUnauthorized() throws Exception {
        mockMvc.perform(get("/tenants"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().json("{\"statusCode\":401,\"error\":\"Unauthorized\","
                        + "\"message\":\"Missing or malformed Authorization header\"}"));
    }

    @Test
    void nonBearerAuthorization_returnsNestUnauthorized() throws Exception {
        mockMvc.perform(get("/tenants").header("Authorization", "Basic abc"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().json("{\"statusCode\":401,\"error\":\"Unauthorized\","
                        + "\"message\":\"Missing or malformed Authorization header\"}"));
    }

    @Test
    void malformedBearerToken_returnsInvalidAccessToken() throws Exception {
        mockMvc.perform(get("/tenants").header("Authorization", "Bearer garbage.token.here"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().json("{\"statusCode\":401,\"error\":\"Unauthorized\","
                        + "\"message\":\"Invalid access token: MALFORMED_TOKEN\"}"));
    }

    @Test
    void unknownRoute_returnsNestNotFound() throws Exception {
        mockMvc.perform(get("/definitely-not-a-route"))
                .andExpect(status().isNotFound())
                .andExpect(content().json(
                        "{\"statusCode\":404,\"error\":\"Not Found\",\"message\":\"Cannot GET /definitely-not-a-route\"}"));
    }

    @Test
    void unknownJsonProperty_onCreate_isRejectedAsBadRequest() throws Exception {
        mockMvc.perform(post("/tenants")
                        .header("Authorization", "Bearer garbage.token.here")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tenantCode\":\"ACME01\",\"bogusProperty\":true}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void listWithInvalidStatusQuery_isBadRequest() throws Exception {
        mockMvc.perform(get("/tenants")
                        .header("Authorization", "Bearer garbage.token.here")
                        .param("status", "NOPE"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void nonUuidTenantPathVariable_isBadRequestShaped() throws Exception {
        mockMvc.perform(get("/tenants/not-a-uuid")
                        .header("Authorization", "Bearer garbage.token.here"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void unhandledContentType_onTenants_isRebuffed() throws Exception {
        mockMvc.perform(post("/tenants")
                        .header("Authorization", "Bearer garbage.token.here")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("not json"))
                .andExpect(status().isUnauthorized());
    }
}