package com.cybelinx.platform.api.persistence;

import com.cybelinx.platform.api.persistence.entity.EventProcessing;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data repository for event processing idempotency. */
public interface EventProcessingRepository extends JpaRepository<EventProcessing, UUID> {

    Optional<EventProcessing> findByEventIdAndConsumerName(UUID eventId, String consumerName);
}
