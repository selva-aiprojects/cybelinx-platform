package com.cybelinx.platform.worker;

import com.cybelinx.platform.worker.outbox.WorkerProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(WorkerProperties.class)
public class EventWorkerApplication {

    public static void main(String[] args) {
        SpringApplication.run(EventWorkerApplication.class, args);
    }
}