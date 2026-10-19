# Production deployment investigation

## Evidence
- The public site continued serving `/Greek_yokk/assets/index-C6QZ6cdj.js`, with Last-Modified `2026-10-19T12:09:05Z`; actual browser checks showed no option-group management or menu assignment UI.
- Build workflow 39278701023 logs show successful publishing of feature commit bf7acdb to gh-pages at `2026-10-19T15:33:13Z`. The Pages output branch therefore already contained the new application.
- The follow-up Pages workflows did not finish publishing. Run 39278883267 exposed a waiting `github-pages` environment, while run 39279731162 remained queued. No reviewers or custom deployment protection apps were configured; both main and gh-pages were allowed by branch policies. The API returned conflicting read/cancel states, so the underlying GitHub service reason could not be established from the exposed data.
- The former workflow only pushed build output to gh-pages. Its success log did not establish that the production URL had published that build; a separate managed Pages workflow controlled the final step.

## Remediation
- Use the official Pages artifact upload and deployment actions from main, with the existing github-pages environment and existing branch restrictions.
- Replace broad contents-write permission with contents-read for build and narrowly scoped pages-write/id-token-write for deploy.
- Stamp the built release with its source commit, workflow run and entry script. Verify the public version.json and index.html match the expected release before reporting workflow success.
- Preserve the old output branch until the new deployment is verified. Remove the obsolete output branch only after the site uses workflow publishing successfully.
- Production inspection screenshots are in `.impeccable/review/production-check/`.

## Branch cleanup
At inspection, main was the only local branch. The only remote branches were main and the legacy gh-pages output branch. An unrelated detached worktree belongs to another task and is retained. No application data, history or unrelated work is part of this cleanup.

## Validation
Workflow YAML parses successfully. Release metadata generation was executed against a synthetic built HTML entry and confirmed to emit the correct source commit and script path. The latest application tree, including the sidebar dot update da107b2, passed all 549 tests in 89 files, lint and build. The new workflow requires a successful public release verification; its run history records the deployment result.
