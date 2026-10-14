# Singulyar Protocol Engine v0.1
import json
import hashlib
import uuid
import datetime
from enum import Enum
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field, asdict

class ObjectKind(str, Enum):
    TEXT = 'text'
    FILE = 'file'
    VOICE = 'voice'
    CALL_INVITE = 'call_invite'
    VALUE_INTENT = 'value_intent'
    CONTACT_INVITE = 'contact_invite'

class DeliveryState(str, Enum):
    DRAFT = 'draft'
    LOCALLY_SAVED = 'locally_saved'
    QUEUED = 'queued'
    ATTEMPTING = 'attempting'
    ACCEPTED_BY_TRANSPORT = 'accepted_by_transport'
    ACKNOWLEDGED_BY_RECIPIENT = 'acknowledged_by_recipient'
    READ = 'read'
    CANCELLED = 'cancelled'
    FAILED = 'failed'
    EXPIRED = 'expired'

class TrustLevel(str, Enum):
    UNKNOWN = 'unknown'
    INVITED = 'invited'
    ADDED = 'added'
    TRUSTED = 'trusted'

@dataclass
class AccessibilityProfile:
    needs_large_text: bool = False
    needs_tts: bool = False
    needs_captions: bool = False

class RepresentationSelector:
    @staticmethod
    def adapt(kind: ObjectKind, payload: Dict[str, Any], profile: AccessibilityProfile) -> Dict[str, Any]:
        adapted = dict(payload)
        if kind == ObjectKind.TEXT:
            if profile.needs_large_text:
                adapted['display_style'] = 'large_24pt'
            if profile.needs_tts:
                adapted['tts_prompt'] = f"Text to speech: {payload.get('text', '')}"
        elif kind == ObjectKind.VALUE_INTENT:
            adapted['intent_disclaimer'] = 'VALUE INTENT (NOT A BANKING TRANSFER)'
        return adapted

@dataclass
class Manifest:
    size_bytes: int
    mime_type: str
    sha256: str
    retention_policy: str = 'local_only'

@dataclass
class DeliveryStatus:
    state: DeliveryState = DeliveryState.DRAFT
    observed_at: str = field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat())
    evidence: str = 'local_creation'

class SingulyarObject:
    SCHEMA = 'singulyar/v0.1/object.json'
    
    def __init__(self, kind: ObjectKind, sender: str, recipient: str, payload: Dict[str, Any]):
        self.schema = SingulyarObject.SCHEMA
        self.id = str(uuid.uuid4())
        self.kind = kind
        self.created_at = datetime.datetime.now(datetime.timezone.utc).isoformat()
        self.sender = sender
        self.recipient = recipient
        self.payload = payload
        
        raw = json.dumps(payload, sort_keys=True).encode('utf-8')
        self.manifest = Manifest(
            size_bytes=len(raw),
            mime_type='application/json',
            sha256=hashlib.sha256(raw).hexdigest()
        )
        self.delivery = DeliveryStatus()
        self.audit_log: List[Dict[str, Any]] = []
        self._record(DeliveryState.DRAFT, 'Initialized')

    def _record(self, state: DeliveryState, details: str):
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        self.delivery.state = state
        self.delivery.observed_at = now
        self.audit_log.append({'time': now, 'state': state.value, 'details': details})

    def transition_to(self, new_state: DeliveryState, details: str) -> bool:
        valid = {
            DeliveryState.DRAFT: [DeliveryState.LOCALLY_SAVED, DeliveryState.CANCELLED],
            DeliveryState.LOCALLY_SAVED: [DeliveryState.QUEUED, DeliveryState.CANCELLED],
            DeliveryState.QUEUED: [DeliveryState.ATTEMPTING, DeliveryState.CANCELLED],
            DeliveryState.ATTEMPTING: [DeliveryState.ACCEPTED_BY_TRANSPORT, DeliveryState.FAILED],
            DeliveryState.ACCEPTED_BY_TRANSPORT: [DeliveryState.ACKNOWLEDGED_BY_RECIPIENT, DeliveryState.FAILED],
            DeliveryState.ACKNOWLEDGED_BY_RECIPIENT: [DeliveryState.READ],
            DeliveryState.READ: [],
            DeliveryState.CANCELLED: [],
            DeliveryState.FAILED: [DeliveryState.QUEUED]
        }
        if new_state not in valid.get(self.delivery.state, []):
            raise ValueError(f'Invalid state transition: {self.delivery.state} -> {new_state}')
        self._record(new_state, details)
        return True

    def to_dict(self) -> Dict[str, Any]:
        return {
            'schema': self.schema,
            'id': self.id,
            'kind': self.kind.value,
            'createdAt': self.created_at,
            'sender': self.sender,
            'recipient': self.recipient,
            'payload': self.payload,
            'manifest': asdict(self.manifest),
            'delivery': asdict(self.delivery),
            'auditLog': self.audit_log
        }

class RelationshipStore:
    def __init__(self):
        self.contacts: Dict[str, Dict[str, Any]] = {}
        self.invite_tokens: Dict[str, str] = {}

    def add_contact(self, contact_id: str, name: str, trust: TrustLevel = TrustLevel.TRUSTED):
        self.contacts[contact_id] = {'id': contact_id, 'name': name, 'trust': trust}

    def generate_invite(self, contact_id: str) -> str:
        token = f'invite-{uuid.uuid4().hex[:8]}'
        self.invite_tokens[token] = contact_id
        return token

    def accept_invite(self, token: str) -> Optional[Dict[str, Any]]:
        if token in self.invite_tokens:
            cid = self.invite_tokens.pop(token)
            if cid in self.contacts:
                self.contacts[cid]['trust'] = TrustLevel.TRUSTED
                return self.contacts[cid]
        return None

class LocalAdapter:
    def __init__(self):
        self.stored: Dict[str, SingulyarObject] = {}

    def probe(self) -> bool:
        return True

    def send(self, obj: SingulyarObject) -> DeliveryStatus:
        if obj.delivery.state == DeliveryState.DRAFT:
            obj.transition_to(DeliveryState.LOCALLY_SAVED, 'Saved in local store')
        self.stored[obj.id] = obj
        return obj.delivery

class FileExportAdapter:
    def __init__(self):
        self.exports: Dict[str, str] = {}

    def probe(self) -> bool:
        return True

    def send(self, obj: SingulyarObject) -> DeliveryStatus:
        obj.transition_to(DeliveryState.LOCALLY_SAVED, 'Prepared for export')
        obj.transition_to(DeliveryState.QUEUED, 'Queued for user download')
        obj.transition_to(DeliveryState.ATTEMPTING, 'Generating file stream')
        obj.transition_to(DeliveryState.ACCEPTED_BY_TRANSPORT, 'Exported to user file')
        self.exports[obj.id] = json.dumps(obj.to_dict(), indent=2, ensure_ascii=False)
        return obj.delivery

class ConformanceTestSuite:
    @staticmethod
    def run():
        # 1. Object Creation & SHA-256
        obj = SingulyarObject(ObjectKind.TEXT, 'user_1', 'user_2', {'text': 'Hello Singulyar'})
        assert len(obj.manifest.sha256) == 64
        assert obj.delivery.state == DeliveryState.DRAFT
        
        # 2. State Machine Transition
        obj.transition_to(DeliveryState.LOCALLY_SAVED, 'Local save')
        try:
            obj.transition_to(DeliveryState.READ, 'Invalid jump')
            assert False, 'Should throw ValueError'
        except ValueError:
            pass
            
        # 3. Representation adaptation
        profile = AccessibilityProfile(needs_large_text=True)
        adapted = RepresentationSelector.adapt(ObjectKind.TEXT, {'text': 'Hi'}, profile)
        assert adapted['display_style'] == 'large_24pt'
        
        # 4. Value intent warning
        adapted_val = RepresentationSelector.adapt(ObjectKind.VALUE_INTENT, {'amount': 10}, profile)
        assert 'NOT A BANKING TRANSFER' in adapted_val['intent_disclaimer']
        
        # 5. Local Adapter
        local = LocalAdapter()
        local.send(obj)
        assert obj.delivery.state == DeliveryState.LOCALLY_SAVED
        
        # 6. File Export Adapter
        export = FileExportAdapter()
        obj2 = SingulyarObject(ObjectKind.TEXT, 'user_1', 'user_2', {'text': 'Export test'})
        export.send(obj2)
        assert obj2.delivery.state == DeliveryState.ACCEPTED_BY_TRANSPORT
        
        # 7. Relationship Store
        rel = RelationshipStore()
        rel.add_contact('c1', 'Alice')
        token = rel.generate_invite('c1')
        assert rel.accept_invite(token) is not None
        assert rel.accept_invite(token) is None # Single use
        
        return 'ALL 7 CONFORMANCE TESTS PASSED SUCCESSFULLY!'

if __name__ == '__main__':
    res = ConformanceTestSuite.run()
    print(res)
