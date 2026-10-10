package com.healthassist.transition.engine;

import com.healthassist.transition.regdata.RegulatoryTypes.StateInfo;

/** State (and county, when known) for the ZIP the person entered. */
public record ResolvedLocation(String state, StateInfo stateInfo, String countyFips, String countyName) {
}
