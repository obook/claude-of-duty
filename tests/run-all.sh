#!/usr/bin/env bash
#
# run-all.sh
# Runs every test-*.js in this folder with Node and prints a summary.
# No dependencies: each test uses Node's built-in assert module.
#
# Usage: ./run-all.sh
#
# Author: Olivier Booklage
# Licence: MIT
#
set -u

cd "$(dirname "$0")"

failures=0
for test_file in test-*.js; do
  if ! node "$test_file"; then
    echo "FAILED: ${test_file}"
    failures=$((failures + 1))
  fi
done

echo
if [ "${failures}" -eq 0 ]; then
  echo "All tests passed."
else
  echo "${failures} test file(s) failed."
  exit 1
fi
