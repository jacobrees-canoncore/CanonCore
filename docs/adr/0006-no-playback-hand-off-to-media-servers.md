---
status: accepted
---

# CanonCore never holds or serves bytes

The product records what exists, what you hold and where it is. It does not store, transcode or
stream media. Where playback is wanted, it hands off to a media server the owner already runs.

## Why

**The Google Drive path is disproportionately expensive.** Streaming or enumerating files on Drive
needs a restricted OAuth scope, which requires an annual CASA security assessment by a
Google-approved lab — roughly $540 a year at the cheapest, up to $4,500, revalidated every twelve
months. The non-restricted `drive.file` scope needs no assessment but reaches only files the app
created or the user picked individually, which does not describe an existing library. Staying in
testing mode avoids verification but expires refresh tokens every seven days.

**Hosting the bytes ourselves is worse.** It puts third-party copyright material on a public URL
under the owner's name with no hosting defence, because it was uploaded rather than stored on
someone else's behalf. The public URL is the definition of done, so the failure mode is the whole
project being taken down.

**Handing off costs nothing and is better engineering.** Plex's 2026 API uses public-key auth with
short-lived JWTs and a PIN flow for third-party apps. Jellyfin's REST API supports remote control —
one client commanding playback on another session — and clients report playback state back. So
CanonCore can tell a device to play something and receive progress, without touching a byte or
holding a Google scope.

## Consequences

- Location is a short kind (physical, local file, cloud, streaming, other) plus free text. It is
  deliberately not a path the product can open, browse or resolve.
- Progress is recorded, never driven, until a media server integration exists. Both store the same
  data, so nothing is foreclosed.
- Reconciling a media server's library against Anchors is an identity-matching problem across two
  systems that disagree, which is the interesting part and the part worth building.
