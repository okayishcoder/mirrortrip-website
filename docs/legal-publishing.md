---
status: current
owner: legal-web
last_verified: 2026-09-21
---

# Legal publishing

Stable public legal documents are `public/terms.html` at `/terms` and `public/privacy.html` at `/privacy`. Historical snapshots are independent dated files under `legal-archive/` and are never deployed or linked publicly.

Materiality is a product/legal decision. A non-material correction keeps the active version and changes only the current public file. A meaningful update archives the outgoing document if needed, publishes a new current page with the new date, deploys and verifies the website, and only then activates the corresponding API version.

Terms and Privacy have independent versions and schedules. Never advance one merely because the other changed. Existing archived snapshots are immutable.

The complete operational checklist is in `legal-archive/README.md`. Website tests enforce the deployment boundary, archive layout/naming, absence of public archive routes, and canonical links. Immutability, materiality, exact outgoing-content comparison, deployment, and backend activation remain manual responsibilities.
