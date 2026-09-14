package com.cybelinx.platform.api.persistence;

import com.cybelinx.platform.api.persistence.entity.UsageEvent;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

/** Repository for {@code usage_events} — metering ingest + query. */
public interface UsageEventRepository
        extends JpaRepository<UsageEvent, UUID>, JpaSpecificationExecutor<UsageEvent> {

    Optional<UsageEvent> findByDedupeKey(String dedupeKey);
}
