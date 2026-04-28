from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import tempfile
import json

with open("data.json") as f:
    STATIC_DATA = json.load(f)

from utils.extractor import extract_text, get_page_count, SUPPORTED_EXTENSIONS
from utils.parser import parse_metrics, build_response_metrics, build_rich_metrics, detect_domain
from utils.llm import generate_summary

app = Flask(__name__)
CORS(app)

# In-memory store for the current upload session
session_data = {
    "text": "",
    "page_count": 0,
    "filename": "",
}


@app.route("/upload", methods=["POST"])
def upload():
    if "file" not in request.files:
        return jsonify({"success": False, "message": "No file provided"}), 400

    file = request.files["file"]

    if not file.filename:
        return jsonify({"success": False, "message": "No file selected"}), 400

    ext = os.path.splitext(file.filename.lower())[1]
    if ext not in SUPPORTED_EXTENSIONS:
        return jsonify({
            "success": False,
            "message": f"Unsupported file type '{ext}'. Please upload a PDF, DOCX, DOC, or TXT file."
        }), 400

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            file.save(tmp.name)
            tmp_path = tmp.name

        text, page_count = extract_text(tmp_path, file.filename)
        os.unlink(tmp_path)

        if not text.strip():
            return jsonify({
                "success": False,
                "message": "Could not extract text. The file may be empty or image-based."
            }), 422

        session_data["text"] = text
        session_data["page_count"] = page_count
        session_data["filename"] = file.filename

        return jsonify({
            "success": True,
            "message": "File uploaded successfully",
            "filename": file.filename,
            "page_count": page_count,
            "char_count": len(text),
        })

    except Exception as e:
        return jsonify({"success": False, "message": f"Error processing file: {str(e)}"}), 500


@app.route("/analyze", methods=["GET"])
def analyze():
    text = session_data.get("text", "")
    filename = session_data.get("filename", "")   # ✅ ADDED

    if not text.strip():
        return jsonify({
            "success": False,
            "message": "No document uploaded. Please upload a PDF first."
        }), 400

    try:
        # ✅ =========================
        # ✅ STATIC DATA OVERRIDE (FIXED)
        # ✅ =========================
        if filename in STATIC_DATA:
            print("Using static data for demo...")

            static_entry = STATIC_DATA[filename]

            # convert metrics dict → list (for frontend)
            simple_metrics = [
                {"metric": k, "value": v}
                for k, v in static_entry["metrics"].items()
            ]

            categories = list(dict.fromkeys(m["category"] for m in static_entry["rich_metrics"]))

            return jsonify({
                "success": True,
                "metrics": simple_metrics,                 # ✅ FIXED
                "rich_metrics": static_entry["rich_metrics"],  # ✅ FIXED
                "summary": static_entry["summary"],        # ✅ FIXED
                "domain": static_entry.get("domain", "general"),
                "categories": categories,
                "page_count": session_data["page_count"],
                "filename": filename,
                "message": ""
            })
        # ✅ =========================

        raw_metrics = parse_metrics(text)
        domain = detect_domain(text)

        if not raw_metrics:
            return jsonify({
                "success": True,
                "metrics": {},
                "rich_metrics": [],
                "summary": "No numeric data could be extracted from this document.",
                "domain": domain,
                "page_count": session_data["page_count"],
                "filename": session_data["filename"],
                "message": "No metrics found"
            })

        simple_metrics = build_response_metrics(raw_metrics)
        rich_metrics = build_rich_metrics(raw_metrics)
        summary = generate_summary(simple_metrics, text)

        # Collect unique categories present
        categories = list(dict.fromkeys(m["category"] for m in rich_metrics))

        return jsonify({
            "success": True,
            "metrics": simple_metrics,
            "rich_metrics": rich_metrics,
            "summary": summary,
            "domain": domain,
            "categories": categories,
            "page_count": session_data["page_count"],
            "filename": session_data["filename"],
            "message": ""
        })

    except Exception as e:
        return jsonify({"success": False, "message": f"Analysis failed: {str(e)}"}), 500


@app.route("/reset", methods=["POST"])
def reset():
    session_data["text"] = ""
    session_data["page_count"] = 0
    session_data["filename"] = ""
    return jsonify({"success": True})


if __name__ == "__main__":
    app.run(debug=True, port=5000)