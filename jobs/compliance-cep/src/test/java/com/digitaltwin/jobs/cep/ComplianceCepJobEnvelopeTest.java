package com.digitaltwin.jobs.cep;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class ComplianceCepJobEnvelopeTest {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Test
    void toEnvelopeJsonEmbedsPayloadObject() throws Exception {
        AlertRecord alert = AlertRecord.create(
                "INT-M001",
                "Internal",
                "Warning",
                "23cced6e-1907-4f3f-b70b-1680418a9dd7",
                "Account",
                "Transaction velocity exceeded threshold",
                Map.of("count", "51", "threshold", "50", "window", "1h"),
                "INT-M001-test-key"
        );

        JsonNode root = MAPPER.readTree(ComplianceCepJob.toEnvelopeJson(alert));
        assertEquals("ComplianceAlertRaised", root.get("eventType").asText());
        assertTrue(root.get("payload").isObject(), "payload must be a JSON object");
        assertEquals("INT-M001", root.get("payload").get("ruleCode").asText());
        assertEquals("23cced6e-1907-4f3f-b70b-1680418a9dd7", root.get("payload").get("personaId").asText());
    }

    @Test
    void paymentWatermarkUsesInitiatedAt() {
        String raw = """
                {
                  "op": "c",
                  "after": {
                    "payment_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    "source_account_id": "0abdf8bc-753c-4685-9807-5ea9aea25378",
                    "initiated_at": "2026-06-14T12:00:00Z"
                  }
                }
                """;
        long expected = Instant.parse("2026-06-14T12:00:00Z").toEpochMilli();
        assertEquals(expected, ComplianceCepJob.paymentEventTimeMillis(raw));
        assertEquals(
                "0abdf8bc-753c-4685-9807-5ea9aea25378",
                ComplianceCepJob.paymentOriginator(raw));
        assertNotNull(ComplianceCepJob.paymentEventWatermarks());
    }
}
