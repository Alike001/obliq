# Private Payables email operations

Status: **adapter implemented; production delivery requires provider validation**

Obliq sends recipient secrets only to a private, authenticated mail adapter.
The web application does not integrate a general email SDK and never writes an
invitation token or verification code to logs, PostgreSQL, analytics or an
ordinary business table.

## Production adapter contract

Configure these through the deployment secret manager:

```text
OBLIQ_RECIPIENT_EMAIL_ENDPOINT=https://private-mail-adapter.example/recipient
OBLIQ_RECIPIENT_EMAIL_TOKEN=<at-least-20-character-bearer-secret>
OBLIQ_RECIPIENT_TOKEN_PEPPER=<distinct-at-least-32-character-secret>
```

The endpoint must be private HTTPS, authenticate the bearer credential, apply
its own rate and destination controls, and accept exactly one of:

```json
{
  "kind": "INVITATION",
  "to": "bound-contact@example.com",
  "invitationUrl": "https://app.example/payables/invitation#token=<secret>"
}
```

```json
{
  "kind": "VERIFICATION_CODE",
  "to": "bound-contact@example.com",
  "code": "123456"
}
```

It returns a strict acceptance receipt:

```json
{
  "accepted": true,
  "providerReference": "mail:123e4567-e89b-12d3-a456-426614174000"
}
```

The adapter should generate that UUID independently. It must not encode the
email, message, token or code. Obliq stores the reference and `ACCEPTED` state;
this proves adapter acceptance only, not inbox delivery or recipient action.
The request is bounded to eight seconds. Timeout, non-2xx, malformed JSON or an
invalid reference fails closed and exposes no message content in the error.

Provider credentials are not present in this repository, so real external
delivery remains **UNVERIFIED** until an owner configures an adapter and records
a controlled delivery test.

## Isolated development sink

The repository includes a loopback-only, memory-only sink. It is not a
production mail service and cannot bind a public interface.

```bash
export OBLIQ_DEV_MAIL_TOKEN="$(openssl rand -hex 24)"
export OBLIQ_DEV_MAIL_PORT=4317
npm run dev:recipient-mail
```

In the application shell, reuse that token without printing it:

```bash
export OBLIQ_RECIPIENT_EMAIL_ENDPOINT=http://127.0.0.1:4317/recipient
export OBLIQ_RECIPIENT_EMAIL_TOKEN="$OBLIQ_DEV_MAIL_TOKEN"
```

An authorized local test client can read the in-memory mailbox from
`GET /messages?to=<fixture-address>` with the same bearer credential. Do not
capture that response in CI logs, screenshots, shell history or committed
files: it contains the invitation URL or verification code by design. `DELETE
/messages` clears it, and process exit destroys every message.

Production mode rejects the loopback HTTP endpoint. The Render preview does not
receive these variables and continues to deny every recipient route.
