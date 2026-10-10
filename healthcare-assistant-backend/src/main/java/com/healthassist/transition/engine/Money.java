package com.healthassist.transition.engine;

import java.math.BigDecimal;
import java.math.RoundingMode;

final class Money {

    static final BigDecimal HUNDRED = BigDecimal.valueOf(100);
    static final BigDecimal TWELVE = BigDecimal.valueOf(12);

    private Money() {
    }

    static BigDecimal nz(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }

    static BigDecimal max(BigDecimal a, BigDecimal b) {
        return a.compareTo(b) >= 0 ? a : b;
    }

    static BigDecimal min(BigDecimal a, BigDecimal b) {
        return a.compareTo(b) <= 0 ? a : b;
    }

    static BigDecimal cents(BigDecimal v) {
        return v == null ? null : v.setScale(2, RoundingMode.HALF_UP);
    }

    static BigDecimal dollars(BigDecimal v) {
        return v == null ? null : v.setScale(0, RoundingMode.HALF_UP);
    }

    /** "$1,234" (rounded to whole dollars). */
    static String usd(BigDecimal v) {
        return String.format(java.util.Locale.US, "$%,d", dollars(v).longValueExact());
    }

    static BigDecimal monthly(BigDecimal annual) {
        return annual.divide(TWELVE, 2, RoundingMode.HALF_UP);
    }
}
