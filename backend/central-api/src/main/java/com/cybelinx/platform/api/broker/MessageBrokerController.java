package com.cybelinx.platform.api.broker;

import com.cybelinx.platform.api.broker.MessageBroker.BrokerStatus;
import com.cybelinx.platform.api.security.RequirePermissions;
import com.cybelinx.platform.api.tenants.TenantConstants;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** REST controller for inspecting and Interacting with the Message Broker pipeline. */
@RestController
@RequestMapping("/broker")
public class MessageBrokerController {

    private final MessageBroker messageBroker;

    public MessageBrokerController(MessageBroker messageBroker) {
        this.messageBroker = messageBroker;
    }

    /** Get active message broker mode and performance metrics. */
    @GetMapping("/status")
    public BrokerStatus getStatus() {
        return messageBroker.status();
    }

    /** Publish a test message onto the broker network. */
    @PostMapping("/publish")
    @ResponseStatus(HttpStatus.ACCEPTED)
    @RequirePermissions(TenantConstants.PERMISSION_TENANT_WRITE)
    public Map<String, Object> publishTestMessage(@Valid @RequestBody TestPublishRequest request) {
        messageBroker.publish(request.topic(), request.routingKey(), request.headers() != null ? request.headers() : Map.of(), request.payload());
        return Map.of(
                "status", "ACCEPTED",
                "topic", request.topic(),
                "mode", messageBroker.brokerMode()
        );
    }

    public record TestPublishRequest(
            @NotBlank(message = "topic is required") String topic,
            String routingKey,
            Map<String, Object> headers,
            Object payload
    ) {}
}
