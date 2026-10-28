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

"""Tiny local test server for Neon City."""

from flask import Flask

app = Flask(__name__, static_folder="neon-city", static_url_path="")


@app.get("/")
def index():
    return app.send_static_file("index.html")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=80)
