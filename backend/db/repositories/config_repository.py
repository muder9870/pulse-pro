from datetime import datetime, timezone
from sqlalchemy.orm import Session
from backend.models import UserPreference
import json

class ConfigRepository:
    def __init__(self, session: Session):
        self.session = session

    def get_setting(self, key: str, default: any = None) -> any:
        pref = self.session.query(UserPreference).filter(UserPreference.key == key).first()
        if not pref: return default
        try:
            return json.loads(pref.value)
        except (ValueError, TypeError):
            return pref.value

    def set_setting(self, key: str, value: any):
        pref = self.session.query(UserPreference).filter(UserPreference.key == key).first()
        str_val = json.dumps(value) if not isinstance(value, str) else value
        if pref:
            pref.value = str_val
        else:
            self.session.add(UserPreference(key=key, value=str_val))
        self.session.commit()

    def get_all_settings(self) -> dict:
        prefs = self.session.query(UserPreference).all()
        result = {}
        for p in prefs:
            try:
                result[p.key] = json.loads(p.value)
            except:
                result[p.key] = p.value
        return result

    def delete_setting(self, key: str):
        self.session.query(UserPreference).filter(UserPreference.key == key).delete()
        self.session.commit()
