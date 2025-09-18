import { describe, expect, it } from "bun:test";
import { computeHMAC, generateSecureToken, verifyHMAC } from "./crypto";

describe("crypto utilities", () => {
  describe("computeHMAC", () => {
    it("should generate consistent HMAC for same input", () => {
      const value = "test-value";
      const hash1 = computeHMAC(value);
      const hash2 = computeHMAC(value);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA256 hex string
    });

    it("should generate different HMACs for different inputs", () => {
      const hash1 = computeHMAC("value1");
      const hash2 = computeHMAC("value2");

      expect(hash1).not.toBe(hash2);
    });

    it("should generate valid hex string", () => {
      const hash = computeHMAC("test");
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
      expect(hash).toHaveLength(64);
    });
  });

  describe("verifyHMAC", () => {
    it("should return true for valid HMAC", () => {
      const value = "test-value";
      const hash = computeHMAC(value);

      const isValid = verifyHMAC(value, hash);
      expect(isValid).toBe(true);
    });

    it("should return false for invalid HMAC", () => {
      const value = "test-value";
      const wrongHash = "a".repeat(64); // Wrong hash with correct length

      const isValid = verifyHMAC(value, wrongHash);
      expect(isValid).toBe(false);
    });

    it("should return false for tampered value", () => {
      const originalValue = "original-value";
      const hash = computeHMAC(originalValue);
      const tamperedValue = "tampered-value";

      const isValid = verifyHMAC(tamperedValue, hash);
      expect(isValid).toBe(false);
    });

    it("should return false for tampered hash", () => {
      const value = "test-value";
      const originalHash = computeHMAC(value);
      const tamperedHash = `${originalHash.slice(0, -1)}0`; // Change last character

      const isValid = verifyHMAC(value, tamperedHash);
      expect(isValid).toBe(false);
    });
  });

  describe("generateSecureToken", () => {
    it("should generate token with default length", () => {
      const token = generateSecureToken();
      expect(token).toHaveLength(32);
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it("should generate token with custom length", () => {
      const length = 16;
      const token = generateSecureToken(length);
      expect(token).toHaveLength(length);
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it("should generate different tokens on each call", () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();

      expect(token1).not.toBe(token2);
    });

    it("should generate tokens with only allowed characters", () => {
      const token = generateSecureToken(100);
      const allowedChars = /^[A-Za-z0-9_-]+$/;
      expect(token).toMatch(allowedChars);
    });

    it("should handle edge case of length 1", () => {
      const token = generateSecureToken(1);
      expect(token).toHaveLength(1);
      expect(token).toMatch(/^[A-Za-z0-9_-]$/);
    });
  });
});
