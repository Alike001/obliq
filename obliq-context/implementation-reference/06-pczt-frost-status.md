# PCZT and FROST Status

PCZT:
- ZIP-374 defines the Partially Created Zcash Transaction format and roles.
- Status at reference-pack creation: Draft.
- It provides a strong conceptual architecture for separating creation, updating, proving, signing, combining, redaction and extraction.
- Obliq should keep transaction-construction/signing boundaries compatible with this direction where practical.
- Do not make PCZT a required V1 dependency unless the exact chosen implementation is demonstrated end-to-end.

FROST:
- ZIP-312 specifies re-randomized FROST for Zcash spend authorization.
- Status at reference-pack creation: Draft.
- It is strategically relevant for organizational 2-of-3-style treasury authorization.
- Do not claim organizational FROST signing unless it is actually integrated and tested.
- Do not fake threshold signing with application approvals.

Important distinction:
Application approvals != cryptographic multisignature.
Both can coexist, but they solve different problems.
