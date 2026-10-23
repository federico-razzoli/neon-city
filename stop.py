#!/usr/bin/env python3
"""Stop the local Flask test app, preserving its virtual environment."""

import os
import signal
import sys
import time

from start import PID_FILE, app_running, saved_pid


def main():
    pid = saved_pid()
    if pid <= 0 or not app_running(pid):
        PID_FILE.unlink(missing_ok=True)
        print("App is not running.")
        return 0
    try:
        os.kill(pid, signal.SIGTERM)
    except ProcessLookupError:
        pass
    for _ in range(50):
        if not app_running(pid):
            PID_FILE.unlink(missing_ok=True)
            print("App stopped.")
            return 0
        time.sleep(0.1)
    print(f"PID {pid} has not stopped; keeping the PID file. Try again.", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
