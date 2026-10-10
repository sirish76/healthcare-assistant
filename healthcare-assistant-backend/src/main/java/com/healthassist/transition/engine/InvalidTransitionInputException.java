package com.healthassist.transition.engine;

import java.util.List;

/** Input problem. Carries field NAMES only — never the submitted values. */
public class InvalidTransitionInputException extends RuntimeException {

    private final List<String> fields;

    public InvalidTransitionInputException(String message, List<String> fields) {
        super(message);
        this.fields = List.copyOf(fields);
    }

    public List<String> fields() {
        return fields;
    }
}
