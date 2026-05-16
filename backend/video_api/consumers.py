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

            count = ChatConsumer._room_connections.get(self.room_id, 0)
            ChatConsumer._room_connections[self.room_id] = count + 1

            if count == 0:
                ChatConsumer._room_tasks[self.room_id] = []
                ai_agents = await self.get_room_ai_agents()
                for i, agent in enumerate(ai_agents):
                    # Stagger each agent's first message by 15s so they don't all fire at once
                    task = asyncio.create_task(
                        self.generate_periodic_ai_feedback(agent, initial_delay=10 + i * 15)
                    )
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

    async def handle_chat_message(self, data):
        msg_text = data.get('message') or data.get('content')
        if msg_text is None:
            return

        sender = data.get('sender', 'unknown')
        is_ai = data.get('is_ai', False)

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
        # AI responses to user messages are triggered via the REST ai_respond endpoint,
        # which calls OpenAI with full conversation history. No duplicate call here.

    async def handle_signal(self, data):
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
        message_data = {
            'type': 'message',
            'message': event['message'],
            'sender': event['sender'],
            'is_ai': event['is_ai'],
            'id': event.get('id'),
            'created_at': event.get('created_at')
        }
        await self.send(text_data=json.dumps(message_data))
        print(f"WebSocket message sent to client: {event['sender']} - {event['message'][:50]}...")

    async def signaling(self, event):
        await self.send(text_data=json.dumps({
            'type': 'signal',
            'signal': event['signal'],
            'caller_id': event['caller_id'],
            'receiver_id': event.get('receiver_id')
        }))

    async def feedback(self, event):
        message_data = {
            'type': 'message',
            'message': event['message'],
            'sender': event['sender'],
            'is_ai': True,
            'id': event.get('id'),
            'created_at': event.get('created_at')
        }
        await self.send(text_data=json.dumps(message_data))
        print(f"AI feedback sent via WebSocket: {event['sender']} - {event['message'][:50]}...")

    async def voice_turn(self, event):
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

    @database_sync_to_async
    def get_recent_messages_text(self, limit=10):
        room = Room.objects.get(room_id=self.room_id)
        messages = Message.objects.filter(room=room).order_by('-created_at')[:limit]
        return "\n".join([f"{m.sender}: {m.content}" for m in reversed(list(messages))])

    async def generate_periodic_ai_feedback(self, agent, initial_delay=10):
        """Periodically send AI feedback. Uses OpenAI when key is set, templates otherwise."""
        await asyncio.sleep(initial_delay)

        while True:
            try:
                # Fetch recent conversation context for a more relevant response
                context = await self.get_recent_messages_text()

                # Run the (potentially blocking) OpenAI call in a thread pool so
                # the event loop stays free for other WebSocket operations.
                feedback = await asyncio.to_thread(
                    generate_ai_feedback, agent['role'], context
                )

                if not feedback or not feedback.strip():
                    print(f"[AI DEBUG] Empty feedback for {agent['name']}, skipping broadcast")
                    await asyncio.sleep(30)
                    continue

                message_info = await self.save_message(agent['name'], feedback, True)

                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'chat.message',
                        'message': feedback,
                        'sender': agent['name'],
                        'is_ai': True,
                        'id': message_info['id'],
                        'created_at': message_info['created_at']
                    }
                )
                print(f"Periodic AI feedback: {agent['name']} - {feedback[:60]}...")

            except asyncio.CancelledError:
                # Task was cancelled on disconnect — exit cleanly
                return
            except Exception as e:
                print(f"Error during periodic feedback for {agent['name']}: {e}")

            # Random interval between 30 and 60 seconds before next message
            await asyncio.sleep(30 + (asyncio.get_event_loop().time() % 30))
