package com.healthassist.transition.cms;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

/**
 * Minimal in-memory cache with per-entry expiry and a size bound.
 * Only for household-independent reference data (never income or results).
 * TODO: consider swapping for Caffeine (spring-boot-starter-cache) later.
 */
public final class TtlCache<K, V> {

    private record Entry<V>(V value, Instant expiresAt) {
    }

    private final Map<K, Entry<V>> map = new ConcurrentHashMap<>();
    private final Duration ttl;
    private final int maxEntries;
    private final Clock clock;

    public TtlCache(Duration ttl, int maxEntries, Clock clock) {
        this.ttl = ttl;
        this.maxEntries = maxEntries;
        this.clock = clock;
    }

    /** Returns the cached value, or loads it. Loader exceptions propagate and nothing is cached. */
    public V get(K key, Supplier<V> loader) {
        Instant now = clock.instant();
        Entry<V> e = map.get(key);
        if (e != null && e.expiresAt().isAfter(now)) {
            return e.value();
        }
        V value = loader.get();
        map.put(key, new Entry<>(value, now.plus(ttl)));
        if (map.size() > maxEntries) {
            evict(now);
        }
        return value;
    }

    public int size() {
        return map.size();
    }

    private synchronized void evict(Instant now) {
        map.entrySet().removeIf(en -> !en.getValue().expiresAt().isAfter(now));
        int excess = map.size() - maxEntries;
        if (excess > 0) {
            map.entrySet().stream()
                    .sorted(Comparator.comparing(en -> en.getValue().expiresAt()))
                    .limit(excess)
                    .map(Map.Entry::getKey)
                    .toList()
                    .forEach(map::remove);
        }
    }
}
