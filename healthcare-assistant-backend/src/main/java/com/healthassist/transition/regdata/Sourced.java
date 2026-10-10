package com.healthassist.transition.regdata;

import java.time.LocalDate;

/**
 * A regulatory value together with where it came from. {@code verified} is set
 * by a human after checking {@code sourceUrl}; {@code todo} marks placeholders.
 */
public record Sourced<T>(T value, LocalDate effectiveDate, String sourceUrl, boolean verified, String todo) {

    public boolean needsReview() {
        return !verified || todo != null;
    }
}
