#!/usr/bin/env bash
# Builds the iPhone/iPad web app, starts the two test servers, runs the tap tests, stops the servers.
#   tests/run.sh            all of them
#   tests/run.sh ipad pc    just those
set -u
cd "$(dirname "$0")/.."
python3 phone/build_web.py > /dev/null || { echo "web app build failed"; exit 1; }
python3 tests/pc_server.py 8820 > tests/out-pc-server.log 2>&1 &
PC=$!
python3 -m http.server 8811 --bind 127.0.0.1 --directory docs/app > /dev/null 2>&1 &
WEB=$!
trap 'kill $PC $WEB 2>/dev/null' EXIT
for i in $(seq 1 40); do
  curl -sf http://127.0.0.1:8820/api/radio/world > /dev/null && curl -sf http://127.0.0.1:8811/ > /dev/null && break
  sleep 0.25
done
node tests/all.js "$@"
