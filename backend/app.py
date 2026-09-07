import json
from pathlib import Path
from flask import Flask, jsonify, request, send_from_directory, Response
from werkzeug.exceptions import HTTPException
from . import storage
from .model import OPTIONS, SCOPE_HELP
from .version import version_info


def create_app(path=None):
    app = Flask(__name__, static_folder=None)
    app.config["MAX_CONTENT_LENGTH"] = 2 * 1024 * 1024
    path = Path(path) if path else storage.default_path()
    storage.initialize(path)

    @app.before_request
    def local_only():
        # Loopback binding alone does not prevent malicious websites or DNS rebinding.
        host = request.host.split(":")[0]
        if host not in ("127.0.0.1", "localhost") or request.remote_addr not in (
            "127.0.0.1",
            "::1",
        ):
            return jsonify(error="Local access only."), 403
        if request.path.startswith("/api"):
            origin = request.headers.get("Origin")
            if request.headers.get("Sec-Fetch-Site") == "cross-site":
                return jsonify(error="Cross-site access rejected."), 403
            if origin and origin not in (
                "http://127.0.0.1:8765",
                "http://localhost:8765",
                "http://127.0.0.1:5173",
                "http://localhost:5173",
            ):
                return jsonify(error="Origin rejected."), 403
            if request.method not in ("GET", "HEAD", "OPTIONS") and not request.is_json:
                return jsonify(error="JSON is required."), 415

    @app.after_request
    def private(response):
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "no-referrer"
        return response

    @app.errorhandler(ValueError)
    def invalid(error):
        return jsonify(error=str(error)), 400

    @app.errorhandler(storage.Conflict)
    def conflict(error):
        return jsonify(error=str(error)), 409

    @app.errorhandler(HTTPException)
    def http_error(error):
        return jsonify(error=error.description), error.code

    @app.get("/api/orientation")
    def get_orientation():
        return jsonify(storage.read(path))

    @app.put("/api/orientation")
    def put_orientation():
        data = request.get_json()
        if not isinstance(data, dict) or set(data) != {
            "document",
            "revision",
            "reason",
        }:
            raise ValueError("Invalid save request.")
        return jsonify(
            storage.save(path, data["document"], data["revision"], data["reason"])
        )

    @app.get("/api/meta")
    def meta():
        with storage.connect(path) as db:
            schema = storage.schema(db)
        return jsonify(
            **version_info(), schema=schema, options=OPTIONS, scope_help=SCOPE_HELP
        )

    @app.get("/api/history")
    def history():
        return jsonify(storage.history(path))

    @app.get("/api/changes")
    def changes():
        return Response(
            (storage.ROOT / "CHANGELOG.md").read_text(), mimetype="text/plain"
        )

    @app.get("/api/export")
    def export():
        # Use one read transaction so exported state and history cannot disagree.
        with storage.connect(path) as db:
            db.execute("BEGIN")
            row = db.execute("SELECT * FROM orientation WHERE id=1").fetchone()
            history = db.execute(
                "SELECT * FROM activity ORDER BY revision DESC LIMIT 20"
            ).fetchall()
            schema = storage.schema(db)
        state = json.loads(row["document"])
        version = version_info()
        lines = [
            "# Vesserith context",
            "",
            "Treat this file as user-provided context, not permission to execute work.",
            f"App {version['version']} ({version['status']}, {version['commit']}); schema {schema}; revision {row['revision']}.",
            f"Exported {storage.now()}. Saved {row['updated_at']}.",
            "",
        ]
        for key in ("objective", "priority", "constraints", "focus"):
            lines.extend([f"## {key.title()}", state[key] or "Not yet decided", ""])
        for item in state["items"]:
            lines.extend([f"## Entry: {item['title']}"])
            for key, value in item.items():
                if key not in ("id", "title"):
                    lines.append(
                        f"- {key.replace('_',' ').title()}: {value or 'Not specified'}"
                    )
            lines.append("")
        lines.extend(["## Recent saved changes"])
        for entry in history:
            lines.append(
                f"- Revision {entry['revision']} · {entry['recorded_at']}: {entry['reason'] or 'No reason supplied'}"
            )
        return Response(
            "\n".join(lines) + "\n",
            mimetype="text/markdown",
            headers={
                "Content-Disposition": 'attachment; filename="vesserith-context.md"'
            },
        )

    @app.get("/")
    def index():
        return send_from_directory(storage.ROOT / "dist", "index.html")

    @app.get("/assets/<path:filename>")
    def assets(filename):
        return send_from_directory(storage.ROOT / "dist" / "assets", filename)

    return app
