import process from 'node:process';
const body = process.env.PR_BODY ?? '';
const updated = /^\s*-\s*\[[xX]\]\s+Documentation updated\s*$/m.test(body);
const unaffected = /^\s*-\s*\[[xX]\]\s+Documentation not affected\s*$/m.test(body);
if (updated === unaffected) { console.error('Select exactly one documentation-impact option in the pull request template.'); process.exit(1); }
if (unaffected && (body.match(/^Documentation impact reason:\s*(.+)$/m)?.[1]?.trim() ?? '').length < 12) { console.error('Provide a meaningful Documentation impact reason when documentation is not affected.'); process.exit(1); }
console.log('Pull request documentation declaration passed.');
