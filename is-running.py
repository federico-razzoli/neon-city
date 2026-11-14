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

"""Report whether the local app started by start.py is running."""

import sys

from start import app_running, saved_pid


def main():
    pid = saved_pid()
    if pid > 0 and app_running(pid):
        print(f"App is running (PID {pid}) on port 80: http://localhost/")
        return 0
    print("App is not running.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
