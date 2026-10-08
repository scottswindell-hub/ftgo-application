package net.chrisrichardson.ftgo.common;

/** Temporary isolated behavior used to verify that governance stays within accepted boundaries. */
public final class GovernanceProbe {

  private GovernanceProbe() {
  }

  public static String normalize(String value) {
    return value == null ? "" : value.trim();
  }
}
