package com.cybelinx.platform.worker.health;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cybelinx.platform.shared.PlatformConstants;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Port of {@code health.controller.spec.ts}: the application-ready event starts the worker, so
 * {@code /health/ready} reports up after bootstrap.
 */
@SpringBootTest(properties = "server.servlet.context-path=")
@AutoConfigureMockMvc
class EventWorkerHealthIT {

    @Autowired private MockMvc mockMvc;

    @Test
    void health_returnsOkWithServiceMetadata() throws Exception {
        mockMvc.perform(get("/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ok"))
                .andExpect(jsonPath("$.service").value(PlatformConstants.APP_NAME))
                .andExpect(jsonPath("$.module").value("event-worker"));
    }

    @Test
    void healthLive_reportsLivenessUp() throws Exception {
        mockMvc.perform(get("/health/live"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ok"))
                .andExpect(jsonPath("$.info.liveness.status").value("up"));
    }

    @Test
    void healthReady_reportsWorkerUpAfterBootstrap() throws Exception {
        mockMvc.perform(get("/health/ready"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ok"))
                .andExpect(jsonPath("$.info.worker.status").value("up"))
                .andExpect(jsonPath("$.info.worker.workerStatus").value("RUNNING"));
    }
}