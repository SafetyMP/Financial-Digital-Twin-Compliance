package com.digitaltwin.jobs.cep;

import com.digitaltwin.jobs.cep.patterns.EventTimeVelocityPattern;
import com.digitaltwin.jobs.cep.patterns.ExposureChecker;
import com.digitaltwin.jobs.cep.patterns.LcrChecker;
import com.digitaltwin.jobs.cep.patterns.VelocityChecker;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

public final class PatternEngine {
    private final VelocityChecker velocity;
    private final ExposureChecker exposure;
    private final LcrChecker lcr;
    private final EventTimeVelocityPattern eventTimeVelocity = new EventTimeVelocityPattern();

    public PatternEngine(JobConfig config, RedisFeatureStore redis) {
        this(config, redis, null);
    }

    public PatternEngine(JobConfig config, RedisFeatureStore redis, DecisionServiceClient decisionClient) {
        this.velocity = new VelocityChecker(config, redis, decisionClient);
        this.exposure = new ExposureChecker(config, redis, decisionClient);
        this.lcr = new LcrChecker(config, redis, decisionClient);
    }

    public Optional<AlertRecord> onPayment(JsonParsers.PaymentEvent payment) {
        return velocity.check(payment);
    }

    /**
     * Event-time velocity, separate from the per-record Redis/Zen checker.
     * {@code watermarkMillis} is the Flink event-time watermark ({@link Long#MIN_VALUE} if none yet).
     */
    public Optional<AlertRecord> onEventTimeVelocity(JsonParsers.PaymentEvent payment, long watermarkMillis) {
        long eventTime = EventTimeVelocityPattern.eventTimeMillis(payment.initiatedAt());
        if (eventTime == Long.MIN_VALUE) {
            return Optional.empty();
        }
        return eventTimeVelocity
                .observe(payment.sourceAccountId(), eventTime, watermarkMillis)
                .map(PatternEngine::toEventTimeAlert);
    }

    public void restoreEventTimeVelocity(String originator, String checkpoint) {
        eventTimeVelocity.restore(originator, checkpoint);
    }

    public String checkpointEventTimeVelocity(String originator) {
        return eventTimeVelocity.checkpoint(originator);
    }

    private static AlertRecord toEventTimeAlert(EventTimeVelocityPattern.Match match) {
        Map<String, String> details = new LinkedHashMap<>();
        details.put("count", Integer.toString(match.count()));
        details.put("threshold", Integer.toString(EventTimeVelocityPattern.THRESHOLD));
        details.put("window", "10m");
        details.put("windowStart", Instant.ofEpochMilli(match.windowStartMillis()).toString());
        details.put("windowEnd", Instant.ofEpochMilli(match.windowEndMillis()).toString());
        details.put("originator", match.originator());
        String idempotencyKey = EventTimeVelocityPattern.RULE_CODE
                + "-" + match.originator()
                + "-" + match.windowStartMillis();
        return AlertRecord.create(
                EventTimeVelocityPattern.RULE_CODE,
                "Internal",
                "Warning",
                match.originator(),
                "Account",
                "Three or more payments from the same originator within 10 minutes",
                details,
                idempotencyKey
        );
    }

    public Optional<AlertRecord> onTwinState(JsonParsers.TwinStateEvent twin) {
        if ("Institution".equals(twin.personaType())) {
            return lcr.check(twin);
        }
        if ("Instrument".equals(twin.personaType())) {
            return exposure.check(twin);
        }
        return Optional.empty();
    }
}
