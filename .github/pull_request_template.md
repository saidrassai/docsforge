## What changed

<!-- Describe the problem and the change. -->

## Domain

- [ ] Skills / agents / commands
- [ ] Framework adapter
- [ ] OpenWiki integration
- [ ] Screenshot workflow
- [ ] Audit / validation
- [ ] CI / automation
- [ ] Documentation

## Verification

- [ ] `node scripts/check-syntax.mjs`
- [ ] `node scripts/self-test.mjs`
- [ ] `node scripts/docs-toolkit.mjs verify`
- [ ] `node scripts/verify-hosts.mjs` (if hosts are available)

## Safety

- [ ] No secrets, production data, or fabricated screenshots
- [ ] No project-specific content added to the global toolkit
- [ ] Existing user content and instructions preserved
- [ ] Public/internal documentation boundaries preserved
