"""Tiny local test server for Neon City."""

from flask import Flask

app = Flask(__name__, static_folder="neon-city", static_url_path="")


@app.get("/")
def index():
    return app.send_static_file("index.html")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=80)
