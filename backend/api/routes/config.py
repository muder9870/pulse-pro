from flask import Blueprint, jsonify, request
from backend.db.session import SessionLocal
from backend.db.repositories.config_repository import ConfigRepository

config_bp = Blueprint('config', __name__, url_prefix='/api/config')

@config_bp.get("/")
def get_all_config():
    db = SessionLocal()
    try:
        repo = ConfigRepository(db)
        return jsonify(repo.get_all_settings()), 200
    finally:
        db.close()

@config_bp.get("/<key>")
def get_config_key(key):
    db = SessionLocal()
    try:
        repo = ConfigRepository(db)
        val = repo.get_setting(key)
        return jsonify({key: val}), 200
    finally:
        db.close()

@config_bp.post("/")
def set_config_key():
    db = SessionLocal()
    try:
        data = request.json or {}
        repo = ConfigRepository(db)
        for k, v in data.items():
            repo.set_setting(k, v)
        return jsonify({"status": "success"}), 200
    finally:
        db.close()

@config_bp.delete("/<key>")
def delete_config_key(key):
    db = SessionLocal()
    try:
        repo = ConfigRepository(db)
        repo.delete_setting(key)
        return jsonify({"status": "success"}), 200
    finally:
        db.close()
