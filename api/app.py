from flask import Flask, jsonify

app = Flask(__name__)

SKILLS = [
    {"name": "HTML", "type": "Markup", "level": "Foundation"},
    {"name": "CSS", "type": "Styling", "level": "Foundation"},
    {"name": "JavaScript", "type": "Language", "level": "Core"},
    {"name": "React.js", "type": "Library", "level": "Frontend"},
    {"name": "Python", "type": "Language", "level": "Backend"},
    {"name": "PHP", "type": "Language", "level": "Backend"},
]

@app.get("/api/skills")
def get_skills():
    return jsonify({"source": "Python Flask API", "skills": SKILLS, "total": len(SKILLS)})

@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "service": "flask"})

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
