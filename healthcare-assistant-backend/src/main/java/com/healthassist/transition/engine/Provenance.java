package com.healthassist.transition.engine;

import com.healthassist.transition.regdata.Sourced;

import java.util.ArrayList;
import java.util.List;
import java.util.TreeSet;

/** Records which regulatory values an analysis used that still need human review. */
final class Provenance {

    private final TreeSet<String> pending = new TreeSet<>();

    <T> T use(String key, Sourced<T> sourced) {
        if (sourced.needsReview()) {
            pending.add(key);
        }
        return sourced.value();
    }

    List<String> pending() {
        return new ArrayList<>(pending);
    }
}
