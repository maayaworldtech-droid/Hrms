# Admin and Manager UI rollback checkpoint

`before-admin-manager-redesign.zip` was saved before this redesign. It contains the complete source as it existed then, including the earlier Employee account menu fix.

`rollback-manifest.json` lists files changed by this redesign and records their final hashes. For a rollback, restore only the listed existing files from the archive and remove only the listed newly added files. Check hashes first so later work is not overwritten. Do not reset the repository or replace unrelated changes.

The archive is a source checkpoint, not a browser data backup. UI verification did not approve leave, edit employees, generate payroll or finalize payments. Ownership tests used separate in-memory storage.

Validation: production build passed, lint completed with warnings and no errors, desktop and 390px phone previews checked, venue filter and reporting Manager form inspected. The isolated checks cover inclusive leave dates, unique colleague counts, manager ownership, team isolation and repeated approval protection. Run them from the project root with `node .ui-backups/verify-operations.cjs`.

Known operational requirement: employees without a reporting Manager must be assigned through Employee Directory → View Employee File → Edit employee → Reports to. Only the known demo employee relationship is used as a fallback; other assignments are not guessed.

Previews: `admin-desktop.png`, `manager-mobile.png`.
