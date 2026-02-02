import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from market.models import Conversation, Message
from django.contrib.auth import get_user_model
from django.conf import settings
import os

User = get_user_model()

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = 'chat_%s' % self.room_name

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    # Receive message from WebSocket
    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        msg_type = text_data_json.get('type', 'message')

        if msg_type == 'offer':
            # Broadcast offer event to conversation participants
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'offer_event',
                    'offer': text_data_json.get('offer', {})
                }
            )
        else:
            # Handle regular chat message
            message = text_data_json['message']
            sender_id = text_data_json['sender_id']

            # Save message to database
            saved_message = await self.save_message(sender_id, message)

            # Send message to room group
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message': saved_message['content'],
                    'sender_id': saved_message['sender_id'],
                    'sender_username': saved_message['sender_username'],
                    'sender_profile_picture': saved_message['sender_profile_picture'],
                    'timestamp': saved_message['timestamp']
                }
            )

    # Receive message from room group
    async def chat_message(self, event):
        message = event['message']
        sender_id = event['sender_id']
        sender_username = event['sender_username']
        sender_profile_picture = event['sender_profile_picture']
        timestamp = event.get('timestamp', '')

        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'message',
            'message': message,
            'sender_id': sender_id,
            'sender_username': sender_username,
            'sender_profile_picture': sender_profile_picture,
            'timestamp': timestamp,
            'conversation': self.room_name
        }))

    # Receive offer event from room group
    async def offer_event(self, event):
        offer = event['offer']

        # Send offer to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'offer',
            'offer': offer,
            'conversation': self.room_name
        }))

    @database_sync_to_async
    def save_message(self, sender_id, message):
        # We assume room_name is the conversation ID
        conversation_id = self.room_name
        sender = User.objects.get(id=sender_id)
        conversation = Conversation.objects.get(id=conversation_id)
        msg = Message.objects.create(conversation=conversation, sender=sender, content=message)
        
        profile_picture = None
        try:
            if hasattr(sender, 'profile') and sender.profile.profile_picture:
                relative_url = sender.profile.profile_picture.url
                # Build absolute URL using BACKEND_URL setting
                backend_url = os.getenv('BACKEND_URL', '').rstrip('/')
                if backend_url:
                    profile_picture = f"{backend_url}{relative_url}"
                else:
                    profile_picture = relative_url
        except Exception:
            pass

        return {
            'content': msg.content,
            'sender_id': sender.id,
            'sender_username': sender.username,
            'sender_profile_picture': profile_picture,
            'timestamp': str(msg.timestamp)
        }

