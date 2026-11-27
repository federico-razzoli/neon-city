# Searching files

Never search the repository recursively from its root (for example
`grep -r … .` or `find .`). Search only named files or specific
directories such as `neon-city/*.js`, and always exclude `.venv`,
`node_modules` and `neon-city/vendor` unless one of them is the target.
Filtering the output (`| grep -v node_modules`) does not count as excluding:
the files are still read.

When reading large files such as `neon-city/vendor/three/three.core.js`,
read one small line range at a time with `sed -n`; do not pipe large ranges
through chains of `awk`, `grep` and `sed`.
