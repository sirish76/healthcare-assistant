package com.healthassist.transition.cms;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

class TtlCacheTest {

    static final class MutableClock extends Clock {
        Instant now = Instant.parse("2026-10-10T00:00:00Z");

        @Override
        public ZoneOffset getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(java.time.ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }

    @Test
    void expiresAfterTtlAndBoundsSize() {
        MutableClock clock = new MutableClock();
        TtlCache<String, Integer> cache = new TtlCache<>(Duration.ofHours(1), 2, clock);
        AtomicInteger loads = new AtomicInteger();

        cache.get("a", loads::incrementAndGet);
        cache.get("a", loads::incrementAndGet);
        assertThat(loads).hasValue(1);

        clock.now = clock.now.plus(Duration.ofMinutes(61));
        cache.get("a", loads::incrementAndGet);
        assertThat(loads).hasValue(2);

        cache.get("b", () -> 0);
        cache.get("c", () -> 0);
        assertThat(cache.size()).isLessThanOrEqualTo(2);
    }

    @Test
    void failedLoadsAreNotCached() {
        TtlCache<String, Integer> cache = new TtlCache<>(Duration.ofHours(1), 10, Clock.systemUTC());
        try {
            cache.get("x", () -> {
                throw new CmsUnavailableException("down", false);
            });
        } catch (CmsUnavailableException ignored) {
            // expected
        }
        assertThat(cache.size()).isZero();
    }
}
