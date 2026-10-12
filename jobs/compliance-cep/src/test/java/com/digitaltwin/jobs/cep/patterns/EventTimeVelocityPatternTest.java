package com.digitaltwin.jobs.cep.patterns;

import com.digitaltwin.jobs.cep.AlertRecord;
import com.digitaltwin.jobs.cep.JobConfig;
import com.digitaltwin.jobs.cep.JsonParsers;
import com.digitaltwin.jobs.cep.PatternEngine;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

class EventTimeVelocityPatternTest {
    private static final long NO_WATERMARK = Long.MIN_VALUE;
    private static final String ORIGIN = "origin-a";
    private static final String OTHER = "origin-b";

    @Test
    void threePaymentsInsideTenMinutesEmitOneAlert() {
        EventTimeVelocityPattern pattern = new EventTimeVelocityPattern();
        long start = minutes(0);
        assertTrue(pattern.observe(ORIGIN, start, NO_WATERMARK).isEmpty());
        assertTrue(pattern.observe(ORIGIN, minutes(4), NO_WATERMARK).isEmpty());
        Optional<EventTimeVelocityPattern.Match> match = pattern.observe(ORIGIN, minutes(9), NO_WATERMARK);

        assertTrue(match.isPresent());
        assertEquals(ORIGIN, match.get().originator());
        assertEquals(3, match.get().count());
        assertEquals(start, match.get().windowStartMillis());
        assertEquals(minutes(9), match.get().windowEndMillis());
        assertTrue(pattern.observe(ORIGIN, minutes(9) + 1, NO_WATERMARK).isEmpty());
    }

    @Test
    void spanOfExactlyTenMinutesMatches() {
        EventTimeVelocityPattern pattern = new EventTimeVelocityPattern();
        pattern.observe(ORIGIN, 0L, NO_WATERMARK);
        pattern.observe(ORIGIN, EventTimeVelocityPattern.WINDOW_MILLIS / 2, NO_WATERMARK);
        Optional<EventTimeVelocityPattern.Match> match =
                pattern.observe(ORIGIN, EventTimeVelocityPattern.WINDOW_MILLIS, NO_WATERMARK);

        assertTrue(match.isPresent());
        assertEquals(0L, match.get().windowStartMillis());
        assertEquals(EventTimeVelocityPattern.WINDOW_MILLIS, match.get().windowEndMillis());
    }

    @Test
    void paymentsMoreThanTenMinutesApartDoNotAlert() {
        EventTimeVelocityPattern pattern = new EventTimeVelocityPattern();
        pattern.observe(ORIGIN, 0L, NO_WATERMARK);
        pattern.observe(ORIGIN, 60_000L, NO_WATERMARK);
        Optional<EventTimeVelocityPattern.Match> match =
                pattern.observe(ORIGIN, EventTimeVelocityPattern.WINDOW_MILLIS + 1, NO_WATERMARK);

        assertTrue(match.isEmpty());
    }

    @Test
    void lateEventDoesNotCompletePattern() {
        EventTimeVelocityPattern pattern = new EventTimeVelocityPattern();
        pattern.observe(ORIGIN, 0L, NO_WATERMARK);
        long watermark = 1_000L;
        assertTrue(pattern.observe(ORIGIN, 1_000L, watermark).isEmpty());
        assertTrue(pattern.observe(ORIGIN, 2_000L, watermark).isEmpty());
    }

    @Test
    void outOfOrderOnTimeEventsStillMatch() {
        EventTimeVelocityPattern pattern = new EventTimeVelocityPattern();
        assertTrue(pattern.observe(ORIGIN, minutes(2), NO_WATERMARK).isEmpty());
        assertTrue(pattern.observe(ORIGIN, minutes(0), NO_WATERMARK).isEmpty());
        Optional<EventTimeVelocityPattern.Match> match = pattern.observe(ORIGIN, minutes(1), NO_WATERMARK);

        assertTrue(match.isPresent());
        assertEquals(minutes(0), match.get().windowStartMillis());
        assertEquals(minutes(2), match.get().windowEndMillis());
    }

    @Test
    void differentOriginatorsDoNotShareAWindow() {
        EventTimeVelocityPattern pattern = new EventTimeVelocityPattern();
        pattern.observe(ORIGIN, minutes(0), NO_WATERMARK);
        pattern.observe(ORIGIN, minutes(1), NO_WATERMARK);
        pattern.observe(OTHER, minutes(2), NO_WATERMARK);
        pattern.observe(OTHER, minutes(3), NO_WATERMARK);

        Optional<EventTimeVelocityPattern.Match> match = pattern.observe(OTHER, minutes(4), NO_WATERMARK);
        assertTrue(match.isPresent());
        assertEquals(OTHER, match.get().originator());
    }

    @Test
    void paymentsAfterAlertedWindowCanAlertAgain() {
        EventTimeVelocityPattern pattern = new EventTimeVelocityPattern();
        assertTrue(pattern.observe(ORIGIN, 0L, NO_WATERMARK).isEmpty());
        assertTrue(pattern.observe(ORIGIN, 60_000L, NO_WATERMARK).isEmpty());
        assertTrue(pattern.observe(ORIGIN, 120_000L, NO_WATERMARK).isPresent());

        long next = EventTimeVelocityPattern.WINDOW_MILLIS + 1;
        assertTrue(pattern.observe(ORIGIN, next, NO_WATERMARK).isEmpty());
        assertTrue(pattern.observe(ORIGIN, next + 60_000L, NO_WATERMARK).isEmpty());
        assertTrue(pattern.observe(ORIGIN, next + 120_000L, NO_WATERMARK).isPresent());
    }

    @Test
    void restoredWindowKeepsTheCountThatWasAlreadySeen() {
        EventTimeVelocityPattern first = new EventTimeVelocityPattern();
        assertTrue(first.observe(ORIGIN, minutes(0), NO_WATERMARK).isEmpty());
        assertTrue(first.observe(ORIGIN, minutes(4), NO_WATERMARK).isEmpty());
        String checkpoint = first.checkpoint(ORIGIN);

        EventTimeVelocityPattern restored = new EventTimeVelocityPattern();
        restored.restore(ORIGIN, checkpoint);
        Optional<EventTimeVelocityPattern.Match> match = restored.observe(ORIGIN, minutes(9), NO_WATERMARK);
        assertTrue(match.isPresent());
        assertEquals(3, match.get().count());

        EventTimeVelocityPattern forgotten = new EventTimeVelocityPattern();
        assertTrue(forgotten.observe(ORIGIN, minutes(9), NO_WATERMARK).isEmpty());
    }

    @Test
    void patternEngineEmitsOneEventTimeAlertFromPaymentTimestamps() {
        PatternEngine engine = new PatternEngine(new JobConfig(Map.of()), null, null);
        String originator = "0abdf8bc-753c-4685-9807-5ea9aea25378";
        assertTrue(engine.onEventTimeVelocity(payment(originator, "2026-06-14T12:00:00Z"), NO_WATERMARK).isEmpty());
        assertTrue(engine.onEventTimeVelocity(payment(originator, "2026-06-14T12:04:00Z"), NO_WATERMARK).isEmpty());

        Optional<AlertRecord> alert = engine.onEventTimeVelocity(
                payment(originator, "2026-06-14T12:09:00Z"), NO_WATERMARK);
        assertTrue(alert.isPresent());
        assertEquals(EventTimeVelocityPattern.RULE_CODE, alert.get().ruleCode());
        assertEquals(originator, alert.get().personaId());
        assertEquals("3", alert.get().details().get("count"));
        assertEquals("10m", alert.get().details().get("window"));
        assertEquals(
                Instant.parse("2026-06-14T12:00:00Z").toString(),
                alert.get().details().get("windowStart"));

        assertTrue(engine.onEventTimeVelocity(payment(originator, "2026-06-14T12:10:00Z"), NO_WATERMARK).isEmpty());
    }

    private static JsonParsers.PaymentEvent payment(String originator, String initiatedAt) {
        return new JsonParsers.PaymentEvent("pay-1", originator, "dest", 10.0, "EUR", initiatedAt);
    }

    private static long minutes(int minutes) {
        return Instant.parse("2026-06-14T12:00:00Z").toEpochMilli() + minutes * 60_000L;
    }
}
