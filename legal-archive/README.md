# Legal Document Publishing Procedure

This repository-only directory stores historical snapshots of the Mirror Trip
Terms of Service and Privacy Policy. It is not part of the public website.
Cloudflare Pages deploys only `public/`, so this directory and its contents must
never be copied there, linked publicly, or exposed through a Worker route.

The stable public documents and canonical URLs are:

| Document | Current public file | Canonical URL |
| --- | --- | --- |
| Terms of Service | `public/terms.html` | `https://mirrortrips.com/terms` |
| Privacy Policy | `public/privacy.html` | `https://mirrortrips.com/privacy` |

There are no public dated legal routes and no public legal manifest.

## Archive layout and naming

Archive snapshots use the technical backend version as their filename:

```text
legal-archive/terms/YYYY-MM-DD.html
legal-archive/privacy/YYYY-MM-DD.html
```

The filename must be a valid date in `YYYY-MM-DD` form. Terms and Privacy are
separate documents with independent versions and update schedules.

Before replacing a current public document, confirm that the outgoing document
has an exact snapshot under its currently active backend version. Once an
archived snapshot has been committed, never edit or overwrite it. A later
version must be added as a new file.

## Choose the update category

Whether a change is material is a product/legal decision. Tooling in this
repository must not attempt to make or infer that decision.

### A. Minor non-material correction

This path may be appropriate for a typo, grammar or formatting correction,
broken URL, or wording clarification that does not change legal meaning.

1. Confirm that the correction is genuinely non-material.
2. Keep the existing legal version.
3. Update the applicable current public file only.
4. Do not create a new acceptance requirement.
5. Let Git history preserve the exact correction.

Do not modify the committed archived snapshot. The archive records the
historical document as it was published; Git records later non-material
corrections made while the same legal version remains active.

### B. Meaningful legal update

This path is required when legal meaning changes. Examples include changed user
obligations, service restrictions, liability or dispute terms, data collection,
use, sharing or retention, user rights, or account deletion and enforcement
rules.

For the affected document:

1. Identify its currently active backend version.
2. Verify that the current public document is archived exactly under that
   version. If it is not, archive the outgoing public file before editing it.
3. Never modify the existing committed archive snapshot.
4. Update only the corresponding current public document:
   `public/terms.html` or `public/privacy.html`.
5. Change the displayed `Last updated` date to the new version date.
6. Use that date in `YYYY-MM-DD` form as the new technical backend version.
7. Run the repository tests and deploy the website first.
8. Verify the affected public page at `/terms` or `/privacy`, including its
   canonical metadata and legacy `.html` redirect.
9. Only after the website is live and verified, update and deploy the
   corresponding backend version.
10. Keep Terms and Privacy independent. A change to one must not change the
    other document's backend version or acceptance state.

Do not create a new archive file for the incoming version until it is the
outgoing current document for a later meaningful update. This keeps each
snapshot tied to the actual public document that was active for that backend
version.

## Backend responsibility and deployment order

The website displays legal documents. It does not store, determine, or update
user acceptance.

The backend stores:

- the current Terms version;
- the current Privacy version; and
- each user's accepted or acknowledged versions and server timestamps.

A meaningful Terms update requires changing the backend Terms version only
after the updated Terms page is live. A meaningful Privacy update changes only
the backend Privacy version and must not be treated as a Terms update.

There is intentionally no automatic backend deployment or backend-version
change in this repository.

## Mobile app behavior

The mobile app always opens the stable canonical URLs:

- `https://mirrortrips.com/terms`
- `https://mirrortrips.com/privacy`

Ordinary legal-content updates do not require a new mobile app release because
these URLs remain stable. Legal versions are fetched from the backend and are
not hardcoded in the app.

## Verification checklist

Before merging or deploying a legal-document change:

- Confirm the update category with the appropriate product/legal owner.
- Confirm `public/terms.html` and `public/privacy.html` still exist.
- Confirm the outgoing meaningful version has an immutable archive snapshot.
- Confirm archive filenames follow `YYYY-MM-DD.html`.
- Confirm the displayed date and proposed backend version agree for a
  meaningful update.
- Confirm shared assets and navigation use root-relative paths.
- Confirm canonical and Open Graph URLs remain extensionless.
- Confirm there are no public archive links, dated legal routes, or manifest.
- Run `npm test`.
- Deploy the website and verify the affected canonical page and `.html`
  redirect.
- For a meaningful update, change only the corresponding backend version after
  the website verification succeeds.

The automated checks cover common repository mistakes, but the materiality
decision, outgoing-snapshot comparison, production deployment, and backend
version change remain deliberate manual steps.
