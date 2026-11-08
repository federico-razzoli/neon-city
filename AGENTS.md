# Browser preference

The user explicitly requires that Firefox never be installed again. Do not install
Firefox, including Playwright Firefox builds. When installing Playwright browsers,
specify Chromium explicitly; do not run an install command that downloads all browsers.

# Dependency installation restriction

The user explicitly prohibits reinstalling the VettaCloud Sites starter dependency
stack (`site-creator-vinext-starter`) that exhausted OS memory on 2026-11-08.
Do not run the Sites `install-dependencies.mjs` helper, `npm ci`, or an equivalent
dependency installation for that site. The offending installation was in
`/tmp/vettacloud-edit/.sites-checkout`; that temporary directory was removed by
the restart. This was a project dependency installation, not a single global npm
module. Preserve this restriction for future work unless the user revokes it.
