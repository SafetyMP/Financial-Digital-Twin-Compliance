package com.digitaltwin.jobs.cep.patterns;

import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Event-time payment velocity. Three or more payments from the same originator
 * whose event times fall inside one 10-minute span emit a single alert.
 * Lateness follows the dataflow model: an event at or behind the watermark is
 * dropped and cannot complete a pattern. Event time comes from the payment
 * timestamp, not from processing time.
 */
public final class EventTimeVelocityPattern {
    public static final long WINDOW_MILLIS = 10L * 60L * 1000L;
    public static final int THRESHOLD = 3;
    public static final String RULE_CODE = "INT-VEL-10M";

    private long watermark = Long.MIN_VALUE;
    private final Map<String, OriginatorWindow> byOriginator = new HashMap<>();

    public static long eventTimeMillis(String initiatedAt) {
        if (initiatedAt == null || initiatedAt.isBlank()) {
            return Long.MIN_VALUE;
        }
        try {
            return Instant.parse(initiatedAt).toEpochMilli();
        } catch (DateTimeParseException e) {
            return Long.MIN_VALUE;
        }
    }

    /**
     * @param watermarkMillis current event-time watermark; {@link Long#MIN_VALUE} means no watermark yet
     */
    public Optional<Match> observe(String originator, long eventTimeMillis, long watermarkMillis) {
        if (originator == null || originator.isEmpty() || eventTimeMillis == Long.MIN_VALUE) {
            return Optional.empty();
        }
        if (watermarkMillis > watermark) {
            watermark = watermarkMillis;
            long horizon = watermark < WINDOW_MILLIS ? Long.MIN_VALUE : watermark - WINDOW_MILLIS;
            for (OriginatorWindow window : byOriginator.values()) {
                window.times.removeIf(timestamp -> timestamp <= horizon);
            }
        }
        if (watermark != Long.MIN_VALUE && eventTimeMillis <= watermark) {
            return Optional.empty();
        }
        OriginatorWindow window = byOriginator.computeIfAbsent(originator, ignored -> new OriginatorWindow());
        if (window.suppressUntil != Long.MIN_VALUE && eventTimeMillis <= window.suppressUntil) {
            return Optional.empty();
        }
        int index = insertSorted(window.times, eventTimeMillis);
        Optional<Match> match = matchIncluding(originator, window.times, index);
        if (match.isEmpty()) {
            return Optional.empty();
        }
        long suppressUntil = match.get().windowStartMillis() + WINDOW_MILLIS;
        window.suppressUntil = suppressUntil;
        window.times.removeIf(timestamp -> timestamp <= suppressUntil);
        return match;
    }

    /**
     * One originator's window, for Flink keyed state. The dataflow model treats
     * this window as operator state that a checkpoint must restore (Akidau et al.,
     * VLDB 2015); a fresh heap map would count the same payments again.
     * Format: suppressUntil, then event times in order.
     */
    public String checkpoint(String originator) {
        OriginatorWindow window = byOriginator.get(originator);
        if (window == null) {
            return null;
        }
        StringBuilder encoded = new StringBuilder().append(window.suppressUntil);
        for (Long timestamp : window.times) {
            encoded.append(',').append(timestamp);
        }
        return encoded.toString();
    }

    public void restore(String originator, String checkpoint) {
        if (originator == null || originator.isEmpty() || checkpoint == null || checkpoint.isEmpty()) {
            return;
        }
        String[] parts = checkpoint.split(",", -1);
        OriginatorWindow window = new OriginatorWindow();
        window.suppressUntil = Long.parseLong(parts[0]);
        for (int i = 1; i < parts.length; i++) {
            if (!parts[i].isEmpty()) {
                window.times.add(Long.parseLong(parts[i]));
            }
        }
        byOriginator.put(originator, window);
    }

    private static Optional<Match> matchIncluding(String originator, List<Long> times, int index) {
        int bestLeft = -1;
        int bestRight = -1;
        int bestCount = 0;
        int left = 0;
        for (int right = 0; right < times.size(); right++) {
            while (times.get(right) - times.get(left) > WINDOW_MILLIS) {
                left++;
            }
            if (index < left || index > right) {
                continue;
            }
            int count = right - left + 1;
            if (count > bestCount) {
                bestCount = count;
                bestLeft = left;
                bestRight = right;
            }
        }
        if (bestCount < THRESHOLD) {
            return Optional.empty();
        }
        return Optional.of(new Match(
                originator,
                bestCount,
                times.get(bestLeft),
                times.get(bestRight)
        ));
    }

    private static int insertSorted(List<Long> times, long eventTimeMillis) {
        int pos = Collections.binarySearch(times, eventTimeMillis);
        if (pos < 0) {
            pos = -pos - 1;
        }
        times.add(pos, eventTimeMillis);
        return pos;
    }

    /**
     * Three payments from one originator inside ten minutes of event time.
     * No Flink cluster. Event time is the dataflow timestamp, not processing time
     * (Akidau et al., "The Dataflow Model", VLDB 2015).
     */
    public static void main(String[] args) {
        EventTimeVelocityPattern pattern = new EventTimeVelocityPattern();
        long start = Instant.parse("2026-10-11T14:00:00Z").toEpochMilli();
        pattern.observe("acct-100", start, Long.MIN_VALUE);
        pattern.observe("acct-100", start + 4L * 60L * 1000L, Long.MIN_VALUE);
        Optional<Match> match = pattern.observe("acct-100", start + 9L * 60L * 1000L, Long.MIN_VALUE);
        if (match.isEmpty()) {
            System.err.println("expected one " + RULE_CODE + " alert");
            System.exit(1);
        }
        Match found = match.get();
        Optional<Match> again = pattern.observe("acct-100", start + 9L * 60L * 1000L + 1L, Long.MIN_VALUE);
        if (again.isPresent()) {
            System.err.println("a payment inside the same span must not emit again");
            System.exit(1);
        }
        System.out.println(RULE_CODE + " originator=" + found.originator() + " count=" + found.count());
    }

    public record Match(String originator, int count, long windowStartMillis, long windowEndMillis) {}

    private static final class OriginatorWindow {
        private final List<Long> times = new ArrayList<>();
        private long suppressUntil = Long.MIN_VALUE;
    }
}
