package com.digitaltwin.jobs.cep;

import com.digitaltwin.jobs.cep.patterns.EventTimeVelocityPattern;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.apache.flink.api.common.eventtime.SerializableTimestampAssigner;
import org.apache.flink.api.common.state.ValueState;
import org.apache.flink.api.common.state.ValueStateDescriptor;
import org.apache.flink.api.common.eventtime.WatermarkStrategy;
import org.apache.flink.api.common.serialization.SimpleStringSchema;
import org.apache.flink.api.java.functions.KeySelector;
import org.apache.flink.connector.base.DeliveryGuarantee;
import org.apache.flink.connector.kafka.sink.KafkaRecordSerializationSchema;
import org.apache.flink.connector.kafka.sink.KafkaSink;
import org.apache.flink.connector.kafka.source.KafkaSource;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.functions.KeyedProcessFunction;
import org.apache.flink.streaming.api.functions.ProcessFunction;
import org.apache.flink.util.Collector;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.logging.Logger;

public class ComplianceCepJob {
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final Logger LOG = Logger.getLogger(ComplianceCepJob.class.getName());
    private static final int PARSE_PREVIEW_LEN = 240;

    public static void main(String[] args) throws Exception {
        Map<String, String> params = parseArgs(args);
        JobConfig config = new JobConfig(params);

        StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
        env.setParallelism(config.parallelism);

        KafkaSource<String> paymentsSource = KafkaSource.<String>builder()
                .setBootstrapServers(config.kafkaBrokers)
                .setTopics("domain.events.public.payments")
                .setGroupId(config.paymentsGroupId)
                .setStartingOffsets(config.paymentsOffsets())
                .setValueOnlyDeserializer(new SimpleStringSchema())
                .build();

        KafkaSource<String> twinSource = KafkaSource.<String>builder()
                .setBootstrapServers(config.kafkaBrokers)
                .setTopics("twin.state.updated")
                .setGroupId(config.twinGroupId)
                .setStartingOffsets(config.twinOffsets())
                .setValueOnlyDeserializer(new SimpleStringSchema())
                .build();

        DataStream<String> paymentAlerts = env.fromSource(paymentsSource, paymentEventWatermarks(), "payments")
                .keyBy(new PaymentOriginatorKey())
                .process(new PaymentAlertProcess(config));

        DataStream<String> twinAlerts = env.fromSource(twinSource, twinEventWatermarks(), "twin-state")
                .process(new TwinAlertProcess(config));

        paymentAlerts.sinkTo(buildAlertSink(config)).name("payment-alerts-sink");
        twinAlerts.sinkTo(buildAlertSink(config)).name("twin-alerts-sink");

        env.execute("compliance-cep");
    }

    static KafkaSink<String> buildAlertSink(JobConfig config) {
        return KafkaSink.<String>builder()
                .setBootstrapServers(config.kafkaBrokers)
                .setDeliveryGuarantee(DeliveryGuarantee.AT_LEAST_ONCE)
                .setRecordSerializer(KafkaRecordSerializationSchema.builder()
                        .setTopic("compliance.alerts")
                        .setValueSerializationSchema(new SimpleStringSchema())
                        .build())
                .build();
    }

    static Map<String, String> parseArgs(String[] args) {
        Map<String, String> params = new HashMap<>();
        for (int i = 0; i < args.length - 1; i++) {
            if (args[i].startsWith("--")) {
                params.put(args[i].substring(2), args[i + 1]);
            }
        }
        return params;
    }

    static String previewPayload(String raw) {
        if (raw == null) {
            return "null";
        }
        if (raw.length() <= PARSE_PREVIEW_LEN) {
            return raw;
        }
        return raw.substring(0, PARSE_PREVIEW_LEN) + "...";
    }

    static String toEnvelopeJson(AlertRecord alert) throws Exception {
        ObjectNode payload = MAPPER.createObjectNode();
        payload.put("alertId", alert.alertId());
        payload.put("ruleCode", alert.ruleCode());
        payload.put("regime", alert.regime());
        payload.put("severity", alert.severity());
        payload.put("status", "Open");
        payload.put("personaId", alert.personaId());
        payload.put("personaType", alert.personaType());
        payload.put("summary", alert.summary());
        payload.put("detectedAt", alert.detectedAt());
        ObjectNode details = payload.putObject("details");
        alert.details().forEach(details::put);

        ObjectNode envelope = MAPPER.createObjectNode();
        envelope.put("eventId", java.util.UUID.randomUUID().toString());
        envelope.put("eventType", "ComplianceAlertRaised");
        envelope.put("eventVersion", "1.0");
        envelope.put("source", "flink-compliance-cep");
        envelope.put("correlationId", alert.correlationId());
        envelope.putNull("causationId");
        envelope.put("timestamp", alert.detectedAt());
        envelope.put("idempotencyKey", alert.idempotencyKey());
        envelope.set("payload", payload);

        return MAPPER.writeValueAsString(envelope);
    }

    /** Payments may arrive slightly out of order; lateness is event time, not processing time. */
    static final Duration PAYMENT_EVENT_TIME_OUT_OF_ORDERNESS = Duration.ofMinutes(1);

    static WatermarkStrategy<String> twinEventWatermarks() {
        return WatermarkStrategy
                .<String>forBoundedOutOfOrderness(PAYMENT_EVENT_TIME_OUT_OF_ORDERNESS)
                .withTimestampAssigner(new TwinTimestampAssigner());
    }

    /**
     * Event time is the envelope timestamp, otherwise the twin's own sync time.
     * A snapshot at or behind the watermark is late (Akidau et al., VLDB 2015).
     */
    static long twinEventTimeMillis(String raw) {
        try {
            com.fasterxml.jackson.databind.JsonNode root = MAPPER.readTree(raw);
            String stamp = JsonParsers.text(root, "timestamp");
            com.fasterxml.jackson.databind.JsonNode payload = root;
            if (root.has("payload")) {
                com.fasterxml.jackson.databind.JsonNode wrapped = root.get("payload");
                payload = wrapped.isTextual() ? MAPPER.readTree(wrapped.asText()) : wrapped;
            }
            if (stamp.isEmpty()) {
                stamp = JsonParsers.text(payload, "lastSyncedAt");
            }
            if (stamp.isEmpty() && payload.has("currentState") && payload.get("currentState").isObject()) {
                stamp = JsonParsers.text(payload.get("currentState"), "updated_at");
            }
            return EventTimeVelocityPattern.eventTimeMillis(stamp);
        } catch (Exception e) {
            return Long.MIN_VALUE;
        }
    }

    static boolean twinEventIsLate(long eventTimeMillis, long watermarkMillis) {
        if (watermarkMillis == Long.MIN_VALUE || eventTimeMillis == Long.MIN_VALUE) {
            return false;
        }
        return eventTimeMillis <= watermarkMillis;
    }

    static WatermarkStrategy<String> paymentEventWatermarks() {
        return WatermarkStrategy
                .<String>forBoundedOutOfOrderness(PAYMENT_EVENT_TIME_OUT_OF_ORDERNESS)
                .withTimestampAssigner(new PaymentTimestampAssigner());
    }

    static long paymentEventTimeMillis(String raw) {
        Optional<JsonParsers.PaymentEvent> payment = JsonParsers.parsePayment(raw);
        if (payment.isEmpty()) {
            return 0L;
        }
        long eventTime = EventTimeVelocityPattern.eventTimeMillis(payment.get().initiatedAt());
        return eventTime == Long.MIN_VALUE ? 0L : eventTime;
    }

    static String paymentOriginator(String raw) {
        return JsonParsers.parsePayment(raw)
                .map(JsonParsers.PaymentEvent::sourceAccountId)
                .orElse("");
    }

    static final class TwinTimestampAssigner implements SerializableTimestampAssigner<String> {
        private static final long serialVersionUID = 1L;

        @Override
        public long extractTimestamp(String element, long recordTimestamp) {
            long eventTime = twinEventTimeMillis(element);
            return eventTime == Long.MIN_VALUE ? 0L : eventTime;
        }
    }

    static final class PaymentTimestampAssigner implements SerializableTimestampAssigner<String> {
        private static final long serialVersionUID = 1L;

        @Override
        public long extractTimestamp(String element, long recordTimestamp) {
            return paymentEventTimeMillis(element);
        }
    }

    static final class PaymentOriginatorKey implements KeySelector<String, String> {
        private static final long serialVersionUID = 1L;

        @Override
        public String getKey(String value) {
            return paymentOriginator(value);
        }
    }

    static class PaymentAlertProcess extends KeyedProcessFunction<String, String, String> {
        private transient PatternEngine engine;
        private transient RedisFeatureStore redis;
        private transient ValueState<String> velocityWindow;

        private final JobConfig config;

        PaymentAlertProcess(JobConfig config) {
            this.config = config;
        }

        private transient DecisionServiceClient decisionClient;

        @Override
        public void open(org.apache.flink.configuration.Configuration parameters) {
            redis = new RedisFeatureStore(config.redisHost, config.redisPort, config.tenantId);
            if (config.usesDecisionService()) {
                decisionClient = new DecisionServiceClient(config.decisionServiceUrl);
                LOG.info("Phase 3b: INT-M001 uses Decision Service (INT-R001) at " + config.decisionServiceUrl);
            }
            engine = new PatternEngine(config, redis, decisionClient);
            velocityWindow = getRuntimeContext().getState(
                    new ValueStateDescriptor<>("int-vel-10m", String.class));
        }

        @Override
        public void close() {
            if (redis != null) {
                redis.close();
            }
        }

        @Override
        public void processElement(String value, Context ctx, Collector<String> out) throws Exception {
            Optional<JsonParsers.PaymentEvent> payment = JsonParsers.parsePayment(value);
            if (payment.isEmpty()) {
                LOG.warning("dropped unparseable payment event: " + previewPayload(value));
                return;
            }
            JsonParsers.PaymentEvent event = payment.get();
            Optional<AlertRecord> alert = engine.onPayment(event);
            if (alert.isPresent()) {
                out.collect(toEnvelopeJson(alert.get()));
            }
            long watermark = ctx.timerService().currentWatermark();
            String savedWindow = velocityWindow.value();
            if (savedWindow != null) {
                engine.restoreEventTimeVelocity(event.sourceAccountId(), savedWindow);
            }
            Optional<AlertRecord> eventTimeAlert = engine.onEventTimeVelocity(event, watermark);
            String nextWindow = engine.checkpointEventTimeVelocity(event.sourceAccountId());
            if (nextWindow == null) {
                velocityWindow.clear();
            } else {
                velocityWindow.update(nextWindow);
            }
            if (eventTimeAlert.isPresent()) {
                out.collect(toEnvelopeJson(eventTimeAlert.get()));
            }
        }
    }

    static class TwinAlertProcess extends ProcessFunction<String, String> {
        private transient PatternEngine engine;
        private transient RedisFeatureStore redis;
        private final JobConfig config;

        TwinAlertProcess(JobConfig config) {
            this.config = config;
        }

        private transient DecisionServiceClient decisionClient;

        @Override
        public void open(org.apache.flink.configuration.Configuration parameters) {
            redis = new RedisFeatureStore(config.redisHost, config.redisPort, config.tenantId);
            if (config.usesDecisionService()) {
                decisionClient = new DecisionServiceClient(config.decisionServiceUrl);
                LOG.info("Phase 3b: INT-M002/BASEL-M001 use Decision Service at " + config.decisionServiceUrl);
            }
            engine = new PatternEngine(config, redis, decisionClient);
        }

        @Override
        public void close() {
            if (redis != null) {
                redis.close();
            }
        }

        @Override
        public void processElement(String value, Context ctx, Collector<String> out) throws Exception {
            Optional<JsonParsers.TwinStateEvent> twin = JsonParsers.parseTwinState(value);
            if (twin.isEmpty()) {
                LOG.warning("dropped unparseable twin.state.updated event: " + previewPayload(value));
                return;
            }
            long watermark = ctx.timerService().currentWatermark();
            if (twinEventIsLate(twinEventTimeMillis(value), watermark)) {
                LOG.warning("dropped late twin.state.updated event: " + previewPayload(value));
                return;
            }
            Optional<AlertRecord> alert = engine.onTwinState(twin.get());
            if (alert.isPresent()) {
                out.collect(toEnvelopeJson(alert.get()));
            }
        }
    }
}
