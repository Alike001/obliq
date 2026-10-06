# Viewing-authority operations and incident response

A UFVK cannot spend, but compromise exposes historical and future receiver,
amount and memo visibility for its scope. Store it only in a secret manager
available to the isolated observer identity. Keep the SQLite cache on encrypted
persistent storage with owner-only permissions and encrypted, access-controlled
backups. Never place either in the web container, PostgreSQL, CI artifacts,
screenshots or telemetry.

On suspected compromise:

1. isolate the observer and revoke secret-manager/runtime access;
2. preserve sanitized host and access evidence without copying the UFVK;
3. mark observation infrastructure UNAVAILABLE—never mark obligations unpaid;
4. assess exposed account scope and notify the organization's incident owner;
5. provision a new viewing/account boundary where protocol and treasury
   operations permit; a UFVK itself cannot be made unknowable to an attacker;
6. rebuild cache from a trusted service, validate heights and correlation, then
   restore observation;
7. record the incident and remediation without viewing material.
