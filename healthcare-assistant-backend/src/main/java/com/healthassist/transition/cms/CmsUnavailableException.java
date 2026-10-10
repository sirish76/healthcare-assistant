package com.healthassist.transition.cms;

/** Plan data couldn't be fetched. The message is safe to show and to log (no user data, no URLs). */
public class CmsUnavailableException extends RuntimeException {

    private final boolean rateLimited;

    public CmsUnavailableException(String message, boolean rateLimited) {
        super(message);
        this.rateLimited = rateLimited;
    }

    public boolean rateLimited() {
        return rateLimited;
    }
}
