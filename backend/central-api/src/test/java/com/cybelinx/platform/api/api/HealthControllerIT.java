package com.cybelinx.platform.api.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

/** Port of {@code health.controller.spec.ts}. */
@SpringBootTest(properties = "server.servlet.context-path=")
@AutoConfigureMockMvc
class HealthControllerIT {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void health_returnsPlatformStatus() throws Exception {
        mockMvc.perform(get("/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ok"))
                .andExpect(jsonPath("$.service").value("Cybelinx Central SaaS Platform"))
                .andExpect(jsonPath("$.module").value("control-plane-api"))
                .andExpect(jsonPath("$.timestamp").isString());
    }

    @Test
    void live_returnsTerminusLivenessShape() throws Exception {
        mockMvc.perform(get("/health/live"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ok"))
                .andExpect(jsonPath("$.info.liveness.status").value("up"))
                .andExpect(jsonPath("$.error").isEmpty())
                .andExpect(jsonPath("$.details.liveness.status").value("up"));
    }

    @Test
    void ready_returnsTerminusReadinessShape() throws Exception {
        mockMvc.perform(get("/health/ready"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ok"))
                .andExpect(jsonPath("$.info.database.status").value("up"))
                .andExpect(jsonPath("$.error").isEmpty())
                .andExpect(jsonPath("$.details.database.status").value("up"));
    }
}