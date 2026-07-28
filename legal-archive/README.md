# Internal Legal Document Archive

This repository-only directory stores historical snapshots of Mirror Trip legal
documents for developers and maintainers. It is not a public website directory,
and none of its contents may be deployed or linked from the public site.

Snapshot files are named using `YYYY-MM-DD`. The filename date corresponds to
the matching backend legal version, not necessarily the date on which the
snapshot file was committed.

Once an archived snapshot has been committed, it must never be modified. A
later legal document version must be added as a new dated file.

For a meaningful future legal-document update:

1. Confirm the version of the current public document.
2. Ensure that exact version is preserved in this archive.
3. Update the public document in `public/`.
4. Update the corresponding backend legal version.
5. Deploy the website before changing the backend version.

Under the agreed project policy, minor non-material corrections may retain the
same version. Confirm that a correction is non-material before applying that
policy.

This archive must remain outside `public/`, the Cloudflare Pages output
directory. Build, copy, and deployment tooling must never place
`legal-archive/` or any of its contents under `public/`.
