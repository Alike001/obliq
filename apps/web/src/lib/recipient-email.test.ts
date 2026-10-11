import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  RecipientEmailDeliveryError,
  sendRecipientEmail,
} from "./recipient-email";

const original = { ...process.env };

afterEach(() => {
  process.env = { ...original };
  vi.unstubAllGlobals();
});

describe("recipient email adapter", () => {
  it("accepts a strict opaque delivery receipt over HTTPS", async () => {
    process.env.OBLIQ_RECIPIENT_EMAIL_ENDPOINT =
      "https://mail.internal.example/recipient";
    process.env.OBLIQ_RECIPIENT_EMAIL_TOKEN = "x".repeat(24);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          accepted: true,
          providerReference: "mail:123e4567-e89b-12d3-a456-426614174000",
        }),
      ),
    );

    await expect(
      sendRecipientEmail({
        kind: "VERIFICATION_CODE",
        to: "recipient@example.test",
        code: "123456",
      }),
    ).resolves.toEqual({
      providerReference: "mail:123e4567-e89b-12d3-a456-426614174000",
    });
  });

  it("allows plaintext only for an isolated loopback development sink", async () => {
    process.env.OBLIQ_RECIPIENT_EMAIL_ENDPOINT = "http://127.0.0.1:4317";
    process.env.OBLIQ_RECIPIENT_EMAIL_TOKEN = "x".repeat(24);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          accepted: true,
          providerReference: "dev:123e4567-e89b-12d3-a456-426614174000",
        }),
      ),
    );
    await expect(
      sendRecipientEmail({
        kind: "INVITATION",
        to: "recipient@example.test",
        invitationUrl: "http://127.0.0.1/payables/invitation#token=hidden",
      }),
    ).resolves.toEqual({
      providerReference: "dev:123e4567-e89b-12d3-a456-426614174000",
    });
  });

  it("rejects insecure remote endpoints and malformed provider evidence", async () => {
    process.env.OBLIQ_RECIPIENT_EMAIL_ENDPOINT =
      "http://mail.internal.example/recipient";
    process.env.OBLIQ_RECIPIENT_EMAIL_TOKEN = "x".repeat(24);
    await expect(
      sendRecipientEmail({
        kind: "VERIFICATION_CODE",
        to: "recipient@example.test",
        code: "123456",
      }),
    ).rejects.toMatchObject({ code: "CONFIGURATION" });

    process.env.OBLIQ_RECIPIENT_EMAIL_ENDPOINT =
      "https://mail.internal.example/recipient";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          accepted: true,
          providerReference: "recipient@example.test",
        }),
      ),
    );
    await expect(
      sendRecipientEmail({
        kind: "VERIFICATION_CODE",
        to: "recipient@example.test",
        code: "123456",
      }),
    ).rejects.toBeInstanceOf(RecipientEmailDeliveryError);
  });

  it("rejects a loopback HTTP adapter in production mode", async () => {
    process.env.OBLIQ_DEPLOYMENT_MODE = "production";
    process.env.OBLIQ_RECIPIENT_EMAIL_ENDPOINT =
      "http://127.0.0.1:4317/recipient";
    process.env.OBLIQ_RECIPIENT_EMAIL_TOKEN = "x".repeat(24);
    await expect(
      sendRecipientEmail({
        kind: "VERIFICATION_CODE",
        to: "recipient@example.test",
        code: "123456",
      }),
    ).rejects.toMatchObject({ code: "CONFIGURATION" });
  });

  it("times out without exposing message contents", async () => {
    process.env.OBLIQ_RECIPIENT_EMAIL_ENDPOINT =
      "https://mail.internal.example/recipient";
    process.env.OBLIQ_RECIPIENT_EMAIL_TOKEN = "x".repeat(24);
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string | URL | Request, init?: RequestInit) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () =>
              reject(new Error("aborted")),
            );
          }),
      ),
    );
    await expect(
      sendRecipientEmail(
        {
          kind: "VERIFICATION_CODE",
          to: "recipient@example.test",
          code: "654321",
        },
        10,
      ),
    ).rejects.toMatchObject({
      code: "UNAVAILABLE",
      message: "Recipient email delivery is unavailable",
    });
  });
});
