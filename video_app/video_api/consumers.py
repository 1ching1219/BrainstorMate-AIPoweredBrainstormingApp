import json
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Room, Message, RoomParticipant
from .ai_utils import generate_ai_feedback, generate_ai_response


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        try:
            self.room_id = self.scope['url_route']['kwargs']['room_id']
            self.room_group_name = f'chat_{self.room_id}'

            # Check if room exists
            room = await self.get_room()
            if not room:
                await self.close()  # Close the connection if room doesn't exist
                return

            # Join room group
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )

            await self.accept()

            # Start AI feedback generators for all AI agents in the room
            ai_agents = await self.get_room_ai_agents()
            for agent in ai_agents:
                await asyncio.sleep(10)
                asyncio.create_task(self.generate_periodic_ai_feedback(agent))

        except Exception as e:
            print(f"Error during connection: {e}")
            await self.close()  # Close the connection on error

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

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
        message = data['message']
        sender = data['sender']
        is_ai = data.get('is_ai', False)

        # Save message to database
        await self.save_message(sender, message, is_ai)

        # Send message to room group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': message,
                'sender': sender,
                'is_ai': is_ai,
                'message_type': 'chat'
            }
        )

        # Generate AI responses to user messages
        if not is_ai:
            ai_agents = await self.get_room_ai_agents()
            for agent in ai_agents:
                if agent['name'] and agent['role'] and (message.lower().find(agent['name'].lower()) != -1 or message.find('?') != -1):
                    asyncio.create_task(self.send_ai_response(agent, message))

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
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'message',
            'message': event['message'],
            'sender': event['sender'],
            'is_ai': event['is_ai'],
            'message_type': event.get('message_type', 'chat')
        }))

    async def signaling(self, event):
        # Send signaling data to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'signal',
            'signal': event['signal'],
            'caller_id': event['caller_id'],
            'receiver_id': event.get('receiver_id')
        }))

    async def feedback(self, event):
        # Send AI feedback to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'message',
            'message': event['message'],
            'sender': event['sender'],
            'is_ai': True,
            'message_type': 'feedback'
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
        Message.objects.create(room=room, sender=sender, content=content, is_ai=is_ai)

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
                await self.save_message(agent['name'], feedback, True)

                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'feedback',
                        'message': feedback,
                        'sender': agent['name']
                    }
                )

                # Random interval between 30 and 90 seconds, adjust this to slow down feedback
                await asyncio.sleep(45 + (asyncio.get_event_loop().time() % 60))  # Adjusted delay for feedback

            except Exception as e:
                print(f"Error during periodic feedback: {e}")
                await asyncio.sleep(30)  # Wait and retry

    async def send_ai_response(self, agent, user_message):
        """Send an AI response to a user message"""
        try:
            # Adjust this sleep time to control response speed
            response = generate_ai_response(user_message, agent['role'])
            await self.save_message(agent['name'], response, True)

            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message': response,
                    'sender': agent['name'],
                    'is_ai': True,
                    'message_type': 'chat'
                }
            )
        except Exception as e:
            print(f"Error generating AI response: {e}")
