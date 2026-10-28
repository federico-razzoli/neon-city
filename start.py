#!/usr/bin/env python3
# Browser Games — standalone browser games, including Neon City.
# Copyright (C) 2026 Federico Razzoli <federico.razzoli@vettabase.com>
# SPDX-License-Identifier: AGPL-3.0-only
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as published by
# the Free Software Foundation, version 3 of the License.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with this program (see LICENSE in the repository root).
# If not, see <https://www.gnu.org/licenses/>.

"""Start the local Flask test app in the background (Linux)."""

from pathlib import Path
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parent
PID_FILE = ROOT / ".neon-city.pid"
LOG_FILE = ROOT / ".neon-city.log"


def app_running(pid):
    """Check identity as well as existence before using a saved PID."""
    try:
        command = Path(f"/proc/{pid}/cmdline").read_bytes().split(b"\0")
        return str(ROOT / "app.py").encode() in command
    except (OSError, ValueError):
        return False


def saved_pid():
    try:
        return int(PID_FILE.read_text().strip())
    except (OSError, ValueError):
        return 0


def main():
    pid = saved_pid()
    if pid > 0 and app_running(pid):
        print(f"Already running (PID {pid}) on port 80: http://<server-ip>/")
        return 0
    PID_FILE.unlink(missing_ok=True)
    python = ROOT / ".venv/bin/python"
    interpreter = str(python)
    try:
        if not python.exists():
            print("Creating virtual environment...", flush=True)
            subprocess.run(
                [sys.executable, "-m", "venv", str(ROOT / ".venv")],
                cwd=ROOT, check=True,
            )
        print("Installing requirements...", flush=True)
        subprocess.run(
            [interpreter, "-m", "pip", "install", "-r", str(ROOT / "requirements.txt")],
            cwd=ROOT, check=True,
        )
    except (OSError, subprocess.CalledProcessError) as exc:
        print(f"Environment setup failed; app was not started: {exc}", file=sys.stderr)
        return 1
    with LOG_FILE.open("w") as log:
        process = subprocess.Popen(
            [interpreter, "-u", str(ROOT / "app.py")], cwd=ROOT,
            stdin=subprocess.DEVNULL, stdout=log, stderr=subprocess.STDOUT,
            start_new_session=True,
        )
    PID_FILE.write_text(str(process.pid) + "\n")
    time.sleep(1)
    if process.poll() is not None:
        PID_FILE.unlink(missing_ok=True)
        print(f"App failed to start:\n{LOG_FILE.read_text()}", file=sys.stderr)
        return 1
    print(f"Started (PID {process.pid}) on 0.0.0.0:80: http://<server-ip>/\nLog: {LOG_FILE}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
