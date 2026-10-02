# 04_verify — prove the build

One job: independently test whether the website performs its actual job.

## Inputs
- `../product/`
- `../03_build/output/build-note.md`
- baseline evidence from `../01_baseline/output/`
- approved direction from `../02_direction/output/`

## Process
Verify:
- real routes and booking path;
- mobile as its own composition;
- keyboard/accessibility basics;
- performance;
- SEO/schema fundamentals;
- content/claim integrity;
- responsive geometry;
- reduced motion;
- broken links/forms;
- visual comparison against baseline and selected references.

Builder self-approval is not sufficient.

## Outputs
- `output/audit.md`
- `output/release-decision.md`
- evidence/screenshots where tooling supports them

## Human check
Any failed hard gate blocks release.
