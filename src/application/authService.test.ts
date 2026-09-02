import { describe, expect, it } from "vitest";
import { readableAuthError } from "./authService";

describe("auth service", () => {
  it.each([
    [
      "auth/unauthorized-domain",
      "Google sign-in is not allowed from this web address. Open PAL at localhost, or add this domain in Firebase Authentication settings.",
    ],
    [
      "auth/operation-not-allowed",
      "Google sign-in is not enabled for this Firebase project yet.",
    ],
    [
      "auth/network-request-failed",
      "Google sign-in could not reach Firebase. Check your connection and try again.",
    ],
  ])("explains %s", (code, message) => {
    expect(readableAuthError({ code })).toBe(message);
  });
});
