import json
import queue
import logging

class EventEmitter:
    def __init__(self):
        self.listeners = []
        self.log = logging.getLogger("event_emitter")

    def subscribe(self):
        q = queue.Queue(maxsize=50)
        self.listeners.append(q)
        return q

    def unsubscribe(self, q):
        if q in self.listeners:
            self.listeners.remove(q)

    def emit(self, event_type: str, data: dict):
        payload = json.dumps({
            "type": event_type,
            "data": data
        })
        self.log.debug(f"Emitting event: {event_type}")
        
        # Create a list of dead listeners to remove
        to_remove = []
        for q in self.listeners:
            try:
                q.put_nowait(payload)
            except queue.Full:
                to_remove.append(q)
        
        for q in to_remove:
            self.unsubscribe(q)

pipeline_emitter = EventEmitter()
