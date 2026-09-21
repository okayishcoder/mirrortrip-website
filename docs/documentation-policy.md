---
status: current
owner: web-platform
last_verified: 2026-08-04
---

# Documentation policy

Cross-project contracts are canonical in `mirrortrip-api/docs`; Cloudflare implementation, deployment, association, and legal-publishing procedures are canonical here.

`npm run docs:check` validates required documents, metadata, relative links, and source-to-document drift mappings. Pull requests must declare documentation impact. Changes to the Worker, public deployment boundary, legal files, or configuration require their mapped document even when a PR author believes the behavior is unchanged.

Treat a failed `Documentation Guard` check as a no-merge condition. Repositories without paid branch-protection support rely on the maintainer enforcing this rule during review. Documentation and tests should change in the same PR as behavior. Merge duplicate guidance into the canonical page before removing it. Never put secrets, private deployment values, or internal legal archives inside `public/`; dated published legal versions remain in `legal-archive/`.
