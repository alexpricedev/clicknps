import { describe, expect, it } from "bun:test";
import { isAdminOrOwner, isMember, isOwner } from "./access";
import type { AuthContext } from "./auth";

describe("Access Middleware", () => {
  describe("isAdminOrOwner", () => {
    it("should return true for owner", () => {
      const auth: AuthContext = {
        isAuthenticated: true,
        user: {
          id: "user-1",
          email: "owner@test.com",
          business_id: "biz-1",
          role: "owner",
          created_at: new Date(),
        },
        business: {
          id: "biz-1",
          business_name: "Test Business",
          created_at: new Date(),
          updated_at: new Date(),
        },
      };

      expect(isAdminOrOwner(auth)).toBe(true);
    });

    it("should return true for admin", () => {
      const auth: AuthContext = {
        isAuthenticated: true,
        user: {
          id: "user-1",
          email: "admin@test.com",
          business_id: "biz-1",
          role: "admin",
          created_at: new Date(),
        },
        business: {
          id: "biz-1",
          business_name: "Test Business",
          created_at: new Date(),
          updated_at: new Date(),
        },
      };

      expect(isAdminOrOwner(auth)).toBe(true);
    });

    it("should return false for member", () => {
      const auth: AuthContext = {
        isAuthenticated: true,
        user: {
          id: "user-1",
          email: "member@test.com",
          business_id: "biz-1",
          role: "member",
          created_at: new Date(),
        },
        business: {
          id: "biz-1",
          business_name: "Test Business",
          created_at: new Date(),
          updated_at: new Date(),
        },
      };

      expect(isAdminOrOwner(auth)).toBe(false);
    });

    it("should return false for unauthenticated user", () => {
      const auth: AuthContext = {
        isAuthenticated: false,
        user: null,
        business: null,
      };

      expect(isAdminOrOwner(auth)).toBe(false);
    });

    it("should return false when user has no role", () => {
      const auth: AuthContext = {
        isAuthenticated: true,
        user: {
          id: "user-1",
          email: "test@test.com",
          business_id: "biz-1",
          created_at: new Date(),
        },
        business: {
          id: "biz-1",
          business_name: "Test Business",
          created_at: new Date(),
          updated_at: new Date(),
        },
      };

      expect(isAdminOrOwner(auth)).toBe(false);
    });
  });

  describe("isOwner", () => {
    it("should return true for owner", () => {
      const auth: AuthContext = {
        isAuthenticated: true,
        user: {
          id: "user-1",
          email: "owner@test.com",
          business_id: "biz-1",
          role: "owner",
          created_at: new Date(),
        },
        business: {
          id: "biz-1",
          business_name: "Test Business",
          created_at: new Date(),
          updated_at: new Date(),
        },
      };

      expect(isOwner(auth)).toBe(true);
    });

    it("should return false for admin", () => {
      const auth: AuthContext = {
        isAuthenticated: true,
        user: {
          id: "user-1",
          email: "admin@test.com",
          business_id: "biz-1",
          role: "admin",
          created_at: new Date(),
        },
        business: {
          id: "biz-1",
          business_name: "Test Business",
          created_at: new Date(),
          updated_at: new Date(),
        },
      };

      expect(isOwner(auth)).toBe(false);
    });

    it("should return false for member", () => {
      const auth: AuthContext = {
        isAuthenticated: true,
        user: {
          id: "user-1",
          email: "member@test.com",
          business_id: "biz-1",
          role: "member",
          created_at: new Date(),
        },
        business: {
          id: "biz-1",
          business_name: "Test Business",
          created_at: new Date(),
          updated_at: new Date(),
        },
      };

      expect(isOwner(auth)).toBe(false);
    });

    it("should return false for unauthenticated user", () => {
      const auth: AuthContext = {
        isAuthenticated: false,
        user: null,
        business: null,
      };

      expect(isOwner(auth)).toBe(false);
    });
  });

  describe("isMember", () => {
    it("should return true for member", () => {
      const auth: AuthContext = {
        isAuthenticated: true,
        user: {
          id: "user-1",
          email: "member@test.com",
          business_id: "biz-1",
          role: "member",
          created_at: new Date(),
        },
        business: {
          id: "biz-1",
          business_name: "Test Business",
          created_at: new Date(),
          updated_at: new Date(),
        },
      };

      expect(isMember(auth)).toBe(true);
    });

    it("should return false for admin", () => {
      const auth: AuthContext = {
        isAuthenticated: true,
        user: {
          id: "user-1",
          email: "admin@test.com",
          business_id: "biz-1",
          role: "admin",
          created_at: new Date(),
        },
        business: {
          id: "biz-1",
          business_name: "Test Business",
          created_at: new Date(),
          updated_at: new Date(),
        },
      };

      expect(isMember(auth)).toBe(false);
    });

    it("should return false for owner", () => {
      const auth: AuthContext = {
        isAuthenticated: true,
        user: {
          id: "user-1",
          email: "owner@test.com",
          business_id: "biz-1",
          role: "owner",
          created_at: new Date(),
        },
        business: {
          id: "biz-1",
          business_name: "Test Business",
          created_at: new Date(),
          updated_at: new Date(),
        },
      };

      expect(isMember(auth)).toBe(false);
    });

    it("should return false for unauthenticated user", () => {
      const auth: AuthContext = {
        isAuthenticated: false,
        user: null,
        business: null,
      };

      expect(isMember(auth)).toBe(false);
    });
  });
});
