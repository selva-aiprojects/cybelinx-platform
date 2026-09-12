package com.cybelinx.platform.worker.health;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cybelinx.platform.worker.WorkerState;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

/** Guards the non-RUNNING branch of {@code /health/ready} (down + 503, terminus shape). */
@SpringBootTest(properties = "server.servlet.context-path=")
@AutoConfigureMockMvc
class EventWorkerReadyDownIT {

    @Autowired private MockMvc mockMvc;

    @MockBean private WorkerState workerState;

    @Test
    void healthReady_reportsWorkerDownWhenNotRunning() throws Exception {
        when(workerState.snapshot())
                .thenReturn(new WorkerState.WorkerSnapshot("STOPPED", null, null, 0));

        mockMvc.perform(get("/health/ready"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.status").value("error"))
                .andExpect(jsonPath("$.error.worker.status").value("down"))
                .andExpect(jsonPath("$.error.worker.workerStatus").value("STOPPED"))
                .andExpect(jsonPath("$.error.worker.heartbeatCount").value(0));
    }
}