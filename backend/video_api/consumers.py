import json
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Room, Message, RoomParticipant
from .ai_utils import generate_ai_feedback, generate_ai_response


class ChatConsumer(AsyncWebsocketConsumer):
    # Class-level tracking so all instances share state
    _room_connections = {}  # room_id -> connection count
    _room_tasks = {}        # room_id -> list of asyncio.Task

    async def connect(self):
        try:
            self.room_id = self.scope['url_route']['kwargs']['room_id']
            self.room_group_name = f'chat_{self.room_id}'

            room = await self.get_room()
            if not room:
                await self.close()
                return

            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            await self.accept()

            # Track connections per room; start feedback tasks only for first joiner
            count = ChatConsumer._room_connections.get(self.room_id, 0)
            ChatConsumer._room_connections[self.room_id] = count + 1

            if count == 0:
                ChatConsumer._room_tasks[self.room_id] = []
                ai_agents = await self.get_room_ai_agents()
                for agent in ai_agents:
                    await asyncio.sleep(10)
                    task = asyncio.create_task(self.generate_periodic_ai_feedback(agent))
                    ChatConsumer._room_tasks[self.room_id].append(task)

        except Exception as e:
            print(f"Error during connection: {e}")
            await self.close()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

        count = ChatConsumer._room_connections.get(self.room_id, 1)
        count -= 1
        if count <= 0:
            # Last user left — cancel all background tasks for this room
            for task in ChatConsumer._room_tasks.pop(self.room_id, []):
                task.cancel()
            ChatConsumer._room_connections.pop(self.room_id, None)
        else:
            ChatConsumer._room_connections[self.room_id] = count

    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get('type', 'message')

        if message_type == 'message':
            await self.handle_chat_message(data)
        elif message_type == 'signal':
            await self.handle_signal(data)
        else:
            # Handle any other message types if necessary
            pass

    async def handle_chat_message(self, data):
        # pull text from either 'message' or 'content'
        msg_text = data.get('message') or data.get('content')
        if msg_text is None:
            # nothing to do if no payload
            return

        sender = data.get('sender', 'unknown')
        is_ai = data.get('is_ai', False)

        # now save and broadcast with the normalized text
        message_info = await self.save_message(sender, msg_text, is_ai)

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat.message',
                'sender': sender,
                'message': msg_text,
                'is_ai': is_ai,
                'id': message_info['id'],
                'created_at': message_info['created_at']
            }
        )

        # Generate AI responses to every user message, staggered so they don't arrive simultaneously
        if not is_ai:
            ai_agents = await self.get_room_ai_agents()
            for i, agent in enumerate(ai_agents):
                if agent['name'] and agent['role']:
                    asyncio.create_task(self.send_ai_response(agent, msg_text, delay=i * 2))

    async def handle_signal(self, data):
        # Handle WebRTC signaling
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'signaling',
                'signal': data['signal'],
                'caller_id': data['caller_id'],
                'receiver_id': data.get('receiver_id')
            }
        )

    async def chat_message(self, event):
        # FIXED: Send message to WebSocket with consistent format that frontend expects
        message_data = {
            'type': 'message',  # Frontend expects this type for regular messages
            'message': event['message'],  # Content goes in 'message' field
            'sender': event['sender'],
            'is_ai': event['is_ai'],
            'id': event.get('id'),
            'created_at': event.get('created_at')
        }
        
        await self.send(text_data=json.dumps(message_data))
        print(f"WebSocket message sent to client: {event['sender']} - {event['message'][:50]}...")

    async def signaling(self, event):
        # Send signaling data to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'signal',
            'signal': event['signal'],
            'caller_id': event['caller_id'],
            'receiver_id': event.get('receiver_id')
        }))

    async def feedback(self, event):
        # FIXED: Send AI feedback to WebSocket with consistent format
        message_data = {
            'type': 'message',  # Use 'message' type so frontend handles it correctly
            'message': event['message'],
            'sender': event['sender'],
            'is_ai': True,
            'id': event.get('id'),
            'created_at': event.get('created_at')
        }
        await self.send(text_data=json.dumps(message_data))
        print(f"AI feedback sent via WebSocket: {event['sender']} - {event['message'][:50]}...")

    async def voice_turn(self, event):
        """Handle voice turn updates"""
        await self.send(text_data=json.dumps({
            'type': 'voice_turn',
            'speaker': event['speaker'],
            'is_ai': event['is_ai'],
            'transcript': event['transcript'],
            'turn_id': event['turn_id']
        }))

    @database_sync_to_async
    def get_room(self):
        try:
            return Room.objects.get(room_id=self.room_id)
        except Room.DoesNotExist:
            return None

    @database_sync_to_async
    def save_message(self, sender, content, is_ai):
        room = Room.objects.get(room_id=self.room_id)
        message = Message.objects.create(room=room, sender=sender, content=content, is_ai=is_ai)
        return {
            'id': message.id,
            'created_at': message.created_at.isoformat()
        }

    @database_sync_to_async
    def get_room_ai_agents(self):
        room = Room.objects.get(room_id=self.room_id)
        ai_participants = RoomParticipant.objects.filter(room=room, is_ai=True)

        agents = []
        for participant in ai_participants:
            agent = {'name': participant.name}
            if participant.ai_agent:
                agent['role'] = participant.ai_agent.role
                agent['id'] = participant.ai_agent.id
            else:
                agent['role'] = 'Assistant'
                agent['id'] = None
            agents.append(agent)

        return agents

    async def generate_periodic_ai_feedback(self, agent):
        """Generate periodic AI feedback for a specific agent"""
        # Wait a bit before starting
        await asyncio.sleep(10)

        while True:
            try:
                feedback = generate_ai_feedback(agent['role'])
                message_info = await self.save_message(agent['name'], feedback, True)

                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'chat.message',  # FIXED: Use chat.message instead of feedback
                        'message': feedback,
                        'sender': agent['name'],
                        'is_ai': True,
                        'id': message_info['id'],
                        'created_at': message_info['created_at']
                    }
                )

                # Random interval between 30 and 60 seconds
                await asyncio.sleep(30 + (asyncio.get_event_loop().time() % 30))

            except Exception as e:
                print(f"Error during periodic feedback: {e}")
                await asyncio.sleep(30)  # Wait and retry

    async def send_ai_response(self, agent, user_message, delay=0):
        """Send an AI response to a user message"""
        try:
            if delay:
                await asyncio.sleep(delay)
            response = generate_ai_response(user_message, agent['role'])
            message_info = await self.save_message(agent['name'], response, True)

            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat.message',  # FIXED: Use chat.message for consistency
                    'message': response,
                    'sender': agent['name'],
                    'is_ai': True,
                    'id': message_info['id'],
                    'created_at': message_info['created_at']
                }
            )
        except Exception as e:
            print(f"Error generating AI response: {e}")