## DO NOT

- Try to start the dev server. The dev server should only be started by the user.
- Do not write backward-compatibility code; this app is only fresh-deployed.

## DO

- If the user explicitly requests backward-compatibility code, write it in the `cmd/migrator` service.
- For any frontend edits, you need to edit both frontend at the same time(web/classic and web/new).
- For admin-only pages, only the classic version have them.

## For GitHub operations

Use the `gh` CLI to perform GitHub operations. e.g. view issues, create PRs, check review comments
