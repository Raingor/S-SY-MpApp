# Repository Guidelines

## Project Structure

This is a native WeChat Mini Program. Routing and lifecycle are in `app.json` and `app.js`; shared styles are in `app.wxss` and `styles/`. Page files (`.js`, `.wxml`, `.wxss`, `.json`) live under `pages/<page>/`. Shared content is in `data/`, helpers in `utils/`, navigation in `custom-tab-bar/`, media in `assets/images/`, and checks/utilities in `scripts/`. `project.config.json` excludes development files from uploads.

## Development and Validation

There is no root `package.json`; import the repository root into WeChat Developer Tools. Run a focused Node check with `node scripts/test-knowledge-panels.cjs` (replace with the relevant script). Run all checks with:

```sh
for file in scripts/test-*.cjs; do node "$file" || exit 1; done
```

Compress source images with `python3 scripts/compress_images.py` and check package size in Developer Tools. Keep local-only config out of uploads.

## Code Style and Naming

Follow nearby style: two-space indentation, JavaScript semicolons, and lower-kebab-case page directories. Keep matching page filenames (for example, `pages/attraction/detail.js` and `detail.wxml`). Put presentation in WXML/WXSS, behavior in JavaScript, and reusable logic in `utils/`. Keep Simplified Chinese, Traditional Chinese, and English content in parity.

## Testing

Checks are standalone CommonJS scripts named `scripts/test-<topic>.cjs`; no test framework or coverage threshold is configured. Run the relevant check after changes, and preview visual updates in WeChat Developer Tools at device size.

## Commits and Pull Requests

Recent commits use short type-prefixed subjects, such as `feat: ...` and `fix: ...`. Keep commits focused. Pull requests should summarize changes, list validation, link related work, and include UI screenshots. Note package-size or API/content contract changes.

## Configuration and Secrets

Never commit AppSecret, API tokens, payment keys, or other credentials. Keep personal settings in ignored config; provide example files for new environment variables. Update `project.config.json` `packOptions.ignore` for developer-only files so they are not shipped.

## Project Log Handoff

After each new change in this repository, notify `sy-main-1008` with a concise summary, affected files, and validation status so it can update the canonical `update-log.md` in the parent S-SY repository. The main task owns that log; do not edit it from this repository.
