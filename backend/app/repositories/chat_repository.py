import datetime
from typing import Dict, Any, List, Optional
from app.db import Query
from app.repositories.base_repository import BaseRepository
from app.utils.serializers import serialize_doc


class ChatRepository(BaseRepository):
    def __init__(self):
        super().__init__('conversations')

    def get_or_create_conversation(self, user1_id: str, user1_name: str, user1_role: str, user2_id: str, user2_name: str, user2_role: str) -> Dict[str, Any]:
        """Finds an existing 1-on-1 conversation or creates a new one."""
        # Query where participants contains user1_id
        docs = self.collection.where('participants', 'array_contains', user1_id).stream()
        for doc in docs:
            data = serialize_doc(doc)
            if user2_id in data.get('participants', []):
                return data

        # Create new
        now = datetime.datetime.now(datetime.timezone.utc)
        record = {
            "participants": [user1_id, user2_id],
            "participantNames": {
                user1_id: user1_name,
                user2_id: user2_name
            },
            "participantRoles": {
                user1_id: user1_role,
                user2_id: user2_role
            },
            "lastMessage": "",
            "lastMessageSenderId": "",
            "lastMessageAt": now,
            "createdAt": now,
            "updatedAt": now
        }
        _, doc_ref = self.collection.add(record)
        return serialize_doc(doc_ref.get())

    def list_user_conversations(self, user_id: str) -> List[Dict[str, Any]]:
        try:
            docs = self.collection.where('participants', 'array_contains', user_id).stream()
            convs = [serialize_doc(doc) for doc in docs]
            convs.sort(key=lambda x: str(x.get('updatedAt') or x.get('lastMessageAt') or x.get('createdAt') or ''), reverse=True)
            return convs
        except Exception:
            return []

    def add_message(self, conversation_id: str, sender_id: str, sender_name: str, text: str) -> Dict[str, Any]:
        now = datetime.datetime.now(datetime.timezone.utc)
        msg_data = {
            "conversationId": conversation_id,
            "senderId": sender_id,
            "senderName": sender_name,
            "text": text,
            "readBy": [sender_id],
            "createdAt": now
        }
        conv_ref = self.collection.document(conversation_id)
        _, msg_ref = conv_ref.collection('messages').add(msg_data)

        # Update conversation meta
        conv_ref.update({
            "lastMessage": text,
            "lastMessageSenderId": sender_id,
            "lastMessageAt": now,
            "updatedAt": now
        })

        return serialize_doc(msg_ref.get())

    def get_messages(self, conversation_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        try:
            msgs = (
                self.collection.document(conversation_id)
                .collection('messages')
                .order_by('createdAt', direction=Query.ASCENDING)
                .limit(limit)
                .stream()
            )
            return [serialize_doc(m) for m in msgs]
        except Exception:
            msgs = (
                self.collection.document(conversation_id)
                .collection('messages')
                .limit(limit)
                .stream()
            )
            items = [serialize_doc(m) for m in msgs]
            items.sort(key=lambda x: str(x.get('createdAt') or ''))
            return items

