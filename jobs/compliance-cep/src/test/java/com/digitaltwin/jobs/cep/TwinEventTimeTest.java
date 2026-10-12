package com.digitaltwin.jobs.cep;

import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TwinEventTimeTest {
    @Test
    void envelopeTimestampIsEventTime() {
        String raw = """
                {"timestamp":"2026-06-14T01:00:00Z","payload":{"personaType":"Institution"}}
                """;
        assertEquals(Instant.parse("2026-06-14T01:00:00Z").toEpochMilli(), ComplianceCepJob.twinEventTimeMillis(raw));
    }

    @Test
    void payloadUpdatedAtIsEventTimeWhenTheEnvelopeHasNone() {
        String raw = """
                {"personaType":"Institution","currentState":{"updated_at":"2026-06-14T02:00:00Z"}}
                """;
        assertEquals(Instant.parse("2026-06-14T02:00:00Z").toEpochMilli(), ComplianceCepJob.twinEventTimeMillis(raw));
    }

    @Test
    void snapshotAtOrBehindTheWatermarkIsLate() {
        long eventTime = Instant.parse("2026-06-14T01:00:00Z").toEpochMilli();
        assertTrue(ComplianceCepJob.twinEventIsLate(eventTime, eventTime));
        assertFalse(ComplianceCepJob.twinEventIsLate(eventTime, Long.MIN_VALUE));
        assertFalse(ComplianceCepJob.twinEventIsLate(eventTime, eventTime - 1));
    }
}
