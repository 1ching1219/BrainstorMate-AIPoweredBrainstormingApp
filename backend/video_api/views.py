# video_api/views.py

from rest_framework import viewsets, status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import AIAgent, Room, RoomParticipant, Message, VoiceSession, VoiceTurn
from .serializers import AIAgentSerializer, RoomSerializer, RoomParticipantSerializer, MessageSerializer
from django.shortcuts import get_object_or_404
from rest_framework.request import Request
from django.http import HttpRequest, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.files.base import ContentFile
from backend import settings
from openai import OpenAI
from .ai_utils import generate_ai_feedback as _template_feedback, generate_ai_response as _template_response
from collections import defaultdict, Counter
from django.utils import timezone
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import random
import time
import os
import json
import asyncio
import base64
import io
import tempfile


try:
    from pydub import AudioSegment
    import soundfile as sf
    import numpy as np
    AUDIO_CONVERSION_AVAILABLE = True
except ImportError:
    AUDIO_CONVERSION_AVAILABLE = False
    print("Audio conversion libraries not installed. Run: pip install pydub soundfile numpy")


# Fix OpenAI import and client initialization
class AIAgentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AIAgent.objects.all()
    serializer_class = AIAgentSerializer

@api_view(['GET'])
def test_media_files(request):
    """Test endpoint to check media file serving"""
    media_root = settings.MEDIA_ROOT
    media_url = settings.MEDIA_URL
    
    # List all files in avatars directory
    avatars_path = os.path.join(media_root, 'avatars')
    files = []
    
    if os.path.exists(avatars_path):
        files = os.listdir(avatars_path)
    
    return JsonResponse({
        'media_root': str(media_root),
        'media_url': media_url,
        'avatars_path': avatars_path,
        'avatar_files': files,
        'debug': settings.DEBUG
    })

@api_view(['POST'])
def create_room(request):
    serializer = RoomSerializer(data=request.data)
    if serializer.is_valid():
        room = serializer.save()
        return Response({'room_id': room.room_id}, status=status.HTTP_201_CREATED)
    else:
        print(serializer.errors)  # 打印錯誤詳情
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


from rest_framework.exceptions import ValidationError
from rest_framework.exceptions import ValidationError
from rest_framework.views import exception_handler

@api_view(['POST'])
def join_room(request, room_id):
    if isinstance(request, HttpRequest):
        request = Request(request)

    data = request.data.copy()
    room = get_object_or_404(Room, room_id=room_id)
    data['room'] = room.id

    # 檢查 ai_agent 是否有效
    ai_agent_id = data.get('ai_agent')
    if ai_agent_id:
        try:
            ai_agent = AIAgent.objects.get(id=ai_agent_id)
        except AIAgent.DoesNotExist:
            raise ValidationError(f"Invalid ai_agent id {ai_agent_id} - object does not exist.")
    
    try:
        serializer = RoomParticipantSerializer(data=data)
        if serializer.is_valid():
            serializer.save(room=room)
            return Response(serializer.data, status=201)
        else:
            return Response({"error": "Invalid data", "details": serializer.errors}, status=400)
    except Exception as e:
        return Response({"error": "Internal server error", "details": str(e)}, status=500)



@api_view(['GET', 'POST'])
def get_room_messages(request, room_id):
    room = get_object_or_404(Room, room_id=room_id)
    if request.method == 'POST':
        serializer = MessageSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(room=room)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    else:  # GET
        messages = Message.objects.filter(room=room).order_by('created_at')
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)

@api_view(['GET'])
def get_room_participants(request, room_id):
    try:
        room = Room.objects.get(room_id=room_id)
        participants = RoomParticipant.objects.filter(room=room)
        serializer = RoomParticipantSerializer(participants, many=True)
        return Response(serializer.data)
    except Room.DoesNotExist:
        return Response({'error': 'Room not found'}, status=status.HTTP_404_NOT_FOUND)
    


@api_view(['GET', 'POST'])
def ai_partners_view(request, room_id):
    if request.method == 'GET':
        try:
            room = Room.objects.get(room_id=room_id)
            return Response({ 'aiPartners': room.ai_partners }, status=status.HTTP_200_OK)
        except Room.DoesNotExist:
            return Response({ 'error': 'Room not found' }, status=status.HTTP_404_NOT_FOUND)

    elif request.method == 'POST':
        try:
            ai_partners = request.data.get('aiPartners', [])
            if not isinstance(ai_partners, list):
                return Response({ 'error': 'Invalid aiPartners data' }, status=status.HTTP_400_BAD_REQUEST)

            room, created = Room.objects.get_or_create(room_id=room_id)
            room.ai_partners = ai_partners
            room.save()
            return Response({ 'success': True, 'aiPartners': room.ai_partners }, status=status.HTTP_200_OK)
        except Exception as e:
            print('Error saving AI partners:', e)
            return Response({ 'error': 'Server error' }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def list_ai_agents(request):
    agents = AIAgent.objects.all()
    serializer = AIAgentSerializer(agents, many=True, context={'request': request})
    return Response(serializer.data)

@api_view(['POST'])
def add_participant(request, room_id):
    try:
        name = request.data.get('name')
        user_id = request.data.get('userId')

        if not name or not user_id:
            return Response({ 'error': 'Missing name or userId' }, status=status.HTTP_400_BAD_REQUEST)

        room, created = Room.objects.get_or_create(room_id=room_id)
        if { 'name': name, 'userId': user_id } not in room.participants:
            room.participants.append({ 'name': name, 'userId': user_id })
            room.save()

        return Response({ 'success': True, 'participants': room.participants }, status=status.HTTP_200_OK)
    except Exception as e:
        print('Error adding participant:', e)
        return Response({ 'error': 'Server error' }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# # 新增存AI
@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
def save_ai_partner(request):
    try:
        print("=== Save AI Partner Debug Info ===")
        print(f"Request method: {request.method}")
        print(f"Content type: {request.content_type}")
        
        # Access form data safely
        role = None
        description = None
        avatar = None
        
        # Try to get text fields from different sources
        if hasattr(request, 'data'):
            try:
                role = request.data.get('role')
                description = request.data.get('description')
                print(f"From request.data - Role: {role}, Description: {description}")
            except Exception as e:
                print(f"Error accessing request.data: {e}")
        
        # Try POST if data didn't work
        if not role or not description:
            try:
                role = role or request.POST.get('role')
                description = description or request.POST.get('description')
                print(f"From request.POST - Role: {role}, Description: {description}")
            except Exception as e:
                print(f"Error accessing request.POST: {e}")
        
        # Get file from FILES
        try:
            avatar = request.FILES.get('avatar')
            if avatar:
                print(f"Avatar file found:")
                print(f"  - Name: {avatar.name}")
                print(f"  - Size: {avatar.size}")
                print(f"  - Content type: {avatar.content_type}")
            else:
                print("No avatar file found in request.FILES")
        except Exception as e:
            print(f"Error accessing request.FILES: {e}")
        
        # Validate required fields
        if not role or not description:
            print("ERROR: Role and description are required")
            return Response({
                'error': 'Role and description are required.',
                'received_role': bool(role),
                'received_description': bool(description),
                'role_value': role,
                'description_value': description
            }, status=status.HTTP_400_BAD_REQUEST)

        # Create AI agent
        ai_agent = AIAgent.objects.create(
            role=role, 
            description=description, 
            avatar=avatar if avatar else None
        )
        
        print(f"AI agent created successfully:")
        print(f"  - ID: {ai_agent.id}")
        print(f"  - Role: {ai_agent.role}")
        print(f"  - Avatar: {ai_agent.avatar}")
        print(f"  - Avatar URL: {ai_agent.avatar.url if ai_agent.avatar else 'None'}")
        
        # Return the created agent data including avatar URL
        response_data = {
            'success': True, 
            'ai_agent_id': ai_agent.id,
            'avatar_url': ai_agent.avatar.url if ai_agent.avatar else None,
            'avatar_path': str(ai_agent.avatar) if ai_agent.avatar else None
        }
        
        print(f"Response data: {response_data}")
        return Response(response_data, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        print(f"ERROR creating AI agent: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({
            'error': 'Failed to save AI partner.', 
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def _delete_avatar_file(ai_agent):
    """Delete the avatar file from storage if one exists."""
    if ai_agent.avatar:
        storage = ai_agent.avatar.storage
        name = ai_agent.avatar.name
        try:
            if storage.exists(name):
                storage.delete(name)
        except Exception as e:
            print(f"Warning: could not delete avatar file '{name}': {e}")


@api_view(['PATCH'])
def update_ai_agent(request, agent_id):
    """Update an existing AI agent's role, description, and optionally avatar."""
    try:
        ai_agent = AIAgent.objects.get(id=agent_id)
    except AIAgent.DoesNotExist:
        return Response({'error': 'AI agent not found'}, status=status.HTTP_404_NOT_FOUND)

    role = request.data.get('role')
    description = request.data.get('description')
    avatar_base64 = request.data.get('avatar_base64')
    avatar_filename = request.data.get('avatar_filename', 'avatar.jpg')

    if role:
        ai_agent.role = role
    if description:
        ai_agent.description = description
    if avatar_base64:
        try:
            image_data = base64.b64decode(avatar_base64)
            _delete_avatar_file(ai_agent)  # remove old file before replacing
            ai_agent.avatar = ContentFile(image_data, name=avatar_filename)
        except Exception as e:
            return Response({'error': f'Invalid avatar data: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

    ai_agent.save()
    return Response({
        'success': True,
        'id': ai_agent.id,
        'role': ai_agent.role,
        'description': ai_agent.description,
        'avatar_url': ai_agent.avatar.url if ai_agent.avatar else None,
    })


@api_view(['DELETE'])
def delete_ai_agent(request, agent_id):
    """Delete an AI agent and its uploaded avatar file."""
    try:
        ai_agent = AIAgent.objects.get(id=agent_id)
    except AIAgent.DoesNotExist:
        return Response({'error': 'AI agent not found'}, status=status.HTTP_404_NOT_FOUND)

    _delete_avatar_file(ai_agent)
    ai_agent.delete()
    return Response({'success': True}, status=status.HTTP_200_OK)


@api_view(['POST'])
def save_ai_partner_base64(request):
    """Save AI partner with base64 image data"""
    try:
        print("=== Save AI Partner Base64 Debug Info ===")
        print(f"Request method: {request.method}")
        print(f"Content type: {request.content_type}")
        
        # Get data from JSON request
        data = request.data
        role = data.get('role')
        description = data.get('description')
        avatar_base64 = data.get('avatar_base64')
        avatar_filename = data.get('avatar_filename', 'avatar.jpg')
        avatar_mimetype = data.get('avatar_mimetype', 'image/jpeg')
        
        print(f"Received:")
        print(f"  - Role: {role}")
        print(f"  - Description: {description}")
        print(f"  - Avatar base64 length: {len(avatar_base64) if avatar_base64 else 0}")
        print(f"  - Avatar filename: {avatar_filename}")
        print(f"  - Avatar mimetype: {avatar_mimetype}")

        if not role or not description:
            return Response({
                'error': 'Role and description are required.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Handle avatar if provided
        avatar_file = None
        if avatar_base64:
            try:
                # Decode base64 to file
                image_data = base64.b64decode(avatar_base64)
                avatar_file = ContentFile(image_data, name=avatar_filename)
                print(f"Avatar file created: {avatar_file.size} bytes")
            except Exception as e:
                print(f"Error processing avatar: {e}")
                return Response({
                    'error': 'Invalid avatar data'
                }, status=status.HTTP_400_BAD_REQUEST)

        # Create AI agent
        ai_agent = AIAgent.objects.create(
            role=role, 
            description=description, 
            avatar=avatar_file
        )
        
        print(f"AI agent created successfully:")
        print(f"  - ID: {ai_agent.id}")
        print(f"  - Role: {ai_agent.role}")
        print(f"  - Avatar: {ai_agent.avatar}")
        print(f"  - Avatar URL: {ai_agent.avatar.url if ai_agent.avatar else 'None'}")
        
        response_data = {
            'success': True, 
            'ai_agent_id': ai_agent.id,
            'avatar_url': ai_agent.avatar.url if ai_agent.avatar else None
        }
        
        return Response(response_data, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        print(f"ERROR creating AI agent: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({
            'error': 'Failed to save AI partner.', 
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def test_upload(request):
    """Test endpoint to debug file uploads"""
    try:
        print("=== Test Upload Debug ===")
        print(f"Request method: {request.method}")
        print(f"Content type: {request.content_type}")
        
        # Check for text fields
        test_field = None
        try:
            test_field = request.data.get('test_field') or request.data.get('test')
        except:
            try:
                test_field = request.POST.get('test_field') or request.POST.get('test')
            except:
                test_field = 'Not found'
        
        # Check for files
        avatar_file = None
        try:
            avatar_file = request.FILES.get('avatar')
            if avatar_file:
                print(f"File received: {avatar_file.name}, size: {avatar_file.size}")
        except Exception as e:
            print(f"No file received: {e}")
        
        return Response({
            'success': True,
            'message': 'Test upload successful!',
            'test_field': test_field,
            'file_received': bool(avatar_file),
            'file_name': avatar_file.name if avatar_file else None,
            'file_size': avatar_file.size if avatar_file else None
        })
        
    except Exception as e:
        print(f"Test upload error: {str(e)}")
        return Response({'error': str(e)}, status=500)

# @api_view(['POST'])
# def save_ai_partner(request):
#     parser_classes = (MultiPartParser, FormParser)
#     role = request.data.get('role')
#     description = request.data.get('description')
#     avatar = request.FILES.get('avatar')

#     print('Received data:', role, description, avatar)

#     if not role or not description:
#         return Response({'error': 'Role and description are required.'}, status=status.HTTP_400_BAD_REQUEST)

#     try:
#         ai_agent = AIAgent.objects.create(role=role, description=description, avatar=avatar)
#         return Response({'success': True, 'ai_agent_id': ai_agent.id}, status=status.HTTP_201_CREATED)
#     except Exception as e:
#         return Response({'error': 'Failed to save AI partner.', 'details': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_room(request, room_id):
    try:
        room = Room.objects.get(room_id=room_id)
        serializer = RoomSerializer(room)
        return Response(serializer.data)
    except Room.DoesNotExist:
        return Response({'error': 'Room not found'}, status=status.HTTP_404_NOT_FOUND)


def select_responding_agents(ai_agents, trigger_type, latest_message=None):
    """
    Select which AI agents should respond based on trigger type and context
    Inspired by AutoGen's agent selection logic
    """
    if trigger_type == 'scheduled':
        # For scheduled responses, randomly select 1-2 agents
        agent_count = min(random.randint(1, 2), ai_agents.count())
        return random.sample(list(ai_agents), agent_count)
    
    elif trigger_type == 'user_message' and latest_message:
        # For user messages, select relevant agents based on content
        message_content = latest_message.get('content', '').lower()
        relevant_agents = []
        
        # Define keywords for each role
        role_keywords = {
            'Designer': ['design', 'ui', 'ux', 'interface', 'user', 'visual', 'layout', 'color', 'font'],
            'Engineer': ['code', 'develop', 'bug', 'performance', 'database', 'api', 'technical', 'architecture'],
            'Finance': ['cost', 'budget', 'revenue', 'roi', 'financial', 'money', 'profit', 'investment'],
            'Professor': ['research', 'study', 'analyze', 'theory', 'methodology', 'academic', 'framework']
        }
        
        for agent in ai_agents:
            agent_role = agent.ai_agent.role
            keywords = role_keywords.get(agent_role, [])
            
            # Check if message content is relevant to this agent
            if any(keyword in message_content for keyword in keywords):
                relevant_agents.append(agent)
        
        # If no specific relevance found, randomly select 1-2 agents
        if not relevant_agents:
            agent_count = min(random.randint(1, 2), ai_agents.count())
            return random.sample(list(ai_agents), agent_count)
        
        # Return relevant agents, but limit to 2 to avoid overwhelming
        return relevant_agents[:2]
    
    else:
        # Default: select one random agent
        return [random.choice(list(ai_agents))]

def generate_ai_response(room, participant, latest_message=None, trigger_type='user_message'):
    """Generate AI response using OpenAI API"""
    try:
        ai_agent = participant.ai_agent
        
        # Fetch recent chat history
        history = Message.objects.filter(room=room).order_by('-created_at')[:15][::-1]
        history_text = "\n".join([f"{m.sender}: {m.content}" for m in history])
        
        # Build context-aware prompt
        if trigger_type == 'scheduled':
            prompt = build_scheduled_prompt(ai_agent, participant, history_text)
        else:
            prompt = build_response_prompt(ai_agent, participant, history_text, latest_message)
        
        # Get API key from environment or settings
        api_key = os.getenv('OPENAI_API_KEY') or getattr(settings, 'OPENAI_API_KEY', None)
        
        if not api_key:
            user_text = latest_message.get('content', '') if isinstance(latest_message, dict) else (latest_message or '')
            return _template_response(user_text, ai_agent.role)
        
        # Call OpenAI API with proper client initialization
        client = OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": prompt}
            ],
            max_tokens=150,  # Keep responses concise
            temperature=0.7  # Balance creativity and consistency
        )
        
        return response.choices[0].message.content.strip()
        
    except Exception as e:
        print(f"Error generating AI response: {str(e)}")
        try:
            user_text = latest_message.get('content', '') if isinstance(latest_message, dict) else (latest_message or '')
            return _template_response(user_text, participant.ai_agent.role)
        except Exception:
            return _template_feedback('default')

def build_scheduled_prompt(ai_agent, participant, history_text):
    """Build prompt for scheduled AI interventions"""
    return f"""You are {ai_agent.role} named {participant.name}. {ai_agent.description}

Recent conversation:
{history_text}

As a {ai_agent.role}, provide a brief, insightful comment or suggestion based on the recent discussion. 
Keep your response concise (1-2 sentences) and relevant to your expertise.
Only respond if you have something valuable to add to the conversation.
If the conversation doesn't relate to your field, you may choose to stay silent by responding with "SKIP".
"""

def build_response_prompt(ai_agent, participant, history_text, latest_message):
    """Build prompt for responding to specific messages"""
    message_content = latest_message.get('content', '') if latest_message else ''
    message_sender = latest_message.get('sender', '') if latest_message else ''
    
    return f"""You are {ai_agent.role} named {participant.name}. {ai_agent.description}

Recent conversation:
{history_text}

{message_sender} just said: "{message_content}"

Respond as a {ai_agent.role} with expertise in your field. Keep your response concise (1-2 sentences) and helpful.
Focus on providing value from your professional perspective.
"""

# Fixed scheduled AI response endpoint
@api_view(['POST'])
def trigger_scheduled_ai_response(request, room_id):
    """Endpoint to trigger scheduled AI responses"""
    try:
        print("=== Scheduled AI Response Debug Info ===")
        print(f"Room ID: {room_id}")
        
        # Fetch room using string room_id
        room = Room.objects.get(room_id=room_id)
        print(f"Room found: {room}")
        
        # Get AI participants from room's ai_partners
        if not room.ai_partners:
            return Response({"message": "No AI partners configured"}, status=200)
        
        # Ensure AI participants exist in RoomParticipant table
        ai_agents = RoomParticipant.objects.filter(room=room, is_ai=True)
        if not ai_agents.exists():
            print("Creating AI participants from room's ai_partners")
            for ai_partner in room.ai_partners:
                try:
                    ai_agent = AIAgent.objects.get(id=ai_partner['id'])
                    RoomParticipant.objects.create(
                        room=room,
                        name=ai_partner['name'],
                        is_ai=True,
                        ai_agent=ai_agent
                    )
                except AIAgent.DoesNotExist:
                    print(f"AI Agent {ai_partner['id']} not found")
                    continue
            ai_agents = RoomParticipant.objects.filter(room=room, is_ai=True)
        
        # Determine which AI should respond for scheduled trigger
        responding_agents = select_responding_agents(ai_agents, 'scheduled', None)
        
        responses = []
        for participant in responding_agents:
            try:
                if not participant.ai_agent:
                    print(f"Warning: Participant {participant.name} has no AI agent assigned")
                    continue
                    
                ai_agent = participant.ai_agent
                print(f"Generating scheduled response for AI agent: {ai_agent.role}")
                
                # Generate AI response
                ai_message = generate_ai_response(room, participant, None, 'scheduled')
                
                if ai_message and ai_message != "SKIP":
                    # Save the message to database
                    message = Message.objects.create(
                        room=room,
                        sender=participant.name,
                        content=ai_message,
                        is_ai=True
                    )
                    
                    response_data = {
                        "message": ai_message,
                        "sender": participant.name,
                        "is_ai": True,
                        "id": message.id,
                        "created_at": message.created_at.isoformat()
                    }
                    
                    responses.append(response_data)
                    
                    # Send via WebSocket - FIXED FORMAT
                    send_websocket_message(room_id, response_data)
                    print(f"Scheduled response sent: {ai_message[:50]}...")
                
            except Exception as e:
                print(f"Error processing scheduled AI agent {participant.name}: {str(e)}")
                continue
            
        return Response({"responses": responses, "count": len(responses)})
        
    except Room.DoesNotExist:
        print(f"Room {room_id} not found")
        return Response({"error": "Room not found"}, status=404)
    except Exception as e:
        print(f"Error in scheduled AI response: {str(e)}")
        return Response({"error": str(e)}, status=500)

def send_websocket_message(room_id, message_data):
    """Send message via WebSocket to all connected clients"""
    try:
        channel_layer = get_channel_layer()
        
        # FIXED: Use consistent format that matches frontend expectations
        websocket_message = {
            "type": "chat.message",  # This calls chat_message method in consumer
            "sender": message_data.get("sender"),
            "message": message_data.get("message"),  # Content goes in 'message' field
            "is_ai": message_data.get("is_ai", False),
            "id": message_data.get("id"),
            "created_at": message_data.get("created_at")
        }
        
        async_to_sync(channel_layer.group_send)(
            f"chat_{room_id}",
            websocket_message
        )
        print(f"WebSocket message sent to room {room_id}: {message_data.get('sender')} - {message_data.get('message', '')[:50]}...")
    except Exception as e:
        print(f"Error sending WebSocket message: {str(e)}")

@api_view(['POST'])
def ai_respond(request, room_id):
    try:
        print("=== AI Response Debug Info ===")
        print(f"Room ID: {room_id}")
        
        latest_message = request.data.get('message')
        trigger_type = request.data.get('trigger_type', 'user_message')  # 'user_message' or 'scheduled'
        
        print(f"Latest message: {latest_message}")
        print(f"Trigger type: {trigger_type}")
        
        # Fetch room using string room_id
        room = Room.objects.get(room_id=room_id)
        print(f"Room found: {room}")
        
        # Get AI participants from room's ai_partners
        if not room.ai_partners:
            return Response({"message": "No AI partners configured"}, status=200)
        
        # Ensure AI participants exist in RoomParticipant table
        ai_agents = RoomParticipant.objects.filter(room=room, is_ai=True)
        if not ai_agents.exists():
            print("Creating AI participants from room's ai_partners")
            for ai_partner in room.ai_partners:
                try:
                    ai_agent = AIAgent.objects.get(id=ai_partner['id'])
                    RoomParticipant.objects.create(
                        room=room,
                        name=ai_partner['name'],
                        is_ai=True,
                        ai_agent=ai_agent
                    )
                except AIAgent.DoesNotExist:
                    print(f"AI Agent {ai_partner['id']} not found")
                    continue
            ai_agents = RoomParticipant.objects.filter(room=room, is_ai=True)
        
        # Determine which AI should respond
        responding_agents = select_responding_agents(ai_agents, trigger_type, latest_message)
        
        responses = []
        for participant in responding_agents:
            try:
                if not participant.ai_agent:
                    print(f"Warning: Participant {participant.name} has no AI agent assigned")
                    continue
                    
                ai_agent = participant.ai_agent
                print(f"Generating response for AI agent: {ai_agent.role}")
                
                # Generate AI response
                ai_message = generate_ai_response(room, participant, latest_message, trigger_type)
                
                if ai_message and ai_message != "SKIP":
                    # Save the message to database
                    message = Message.objects.create(
                        room=room,
                        sender=participant.name,
                        content=ai_message,
                        is_ai=True
                    )
                    
                    response_data = {
                        "message": ai_message,
                        "sender": participant.name,
                        "is_ai": True,
                        "id": message.id,
                        "created_at": message.created_at.isoformat()
                    }
                    
                    responses.append(response_data)
                    
                    # Send via WebSocket - FIXED FORMAT
                    send_websocket_message(room_id, response_data)
                    print(f"AI response sent: {ai_message[:50]}...")
                
            except Exception as e:
                print(f"Error processing AI agent {participant.name}: {str(e)}")
                continue
            
        return Response({"responses": responses, "count": len(responses)})
        
    except Room.DoesNotExist:
        print(f"Room {room_id} not found")
        return Response({"error": "Room not found"}, status=404)
    except Exception as e:
        print(f"Error in ai_respond: {str(e)}")
        return Response({"error": str(e)}, status=500)

# Voice session management
@api_view(['POST'])
def create_voice_session(request, room_id):
    try:
        room = get_object_or_404(Room, room_id=room_id)
        session_id = f"voice_{room_id}_{timezone.now().strftime('%Y%m%d_%H%M%S')}"
        
        voice_session = VoiceSession.objects.create(
            room=room,
            session_id=session_id,
            is_active=True
        )
        
        return Response({
            'session_id': session_id,
            'status': 'created'
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
def end_voice_session(request, room_id, session_id):
    try:
        voice_session = get_object_or_404(VoiceSession, session_id=session_id, room__room_id=room_id)
        voice_session.is_active = False
        voice_session.save()
        
        return Response({'status': 'ended'}, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
def handle_voice_turn(request, room_id):
    try:
        room = get_object_or_404(Room, room_id=room_id)
        data = request.data
        
        # Get active voice session
        voice_session = VoiceSession.objects.filter(
            room=room, 
            is_active=True
        ).first()
        
        if not voice_session:
            return Response({'error': 'No active voice session'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create voice turn record
        voice_turn = VoiceTurn.objects.create(
            voice_session=voice_session,
            speaker_name=data.get('speaker_name'),
            is_ai=data.get('is_ai', False),
            ai_agent_id=data.get('ai_agent_id'),
            audio_duration=data.get('audio_duration'),
            transcript=data.get('transcript', '')
        )
        
        # Update session current speaker
        voice_session.current_speaker = data.get('speaker_name')
        voice_session.save()
        
        # Notify via WebSocket
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'chat_{room_id}',
            {
                'type': 'voice.turn',
                'speaker': data.get('speaker_name'),
                'is_ai': data.get('is_ai', False),
                'transcript': data.get('transcript', ''),
                'turn_id': voice_turn.id
            }
        )
        
        return Response({
            'turn_id': voice_turn.id,
            'status': 'created'
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

def select_next_ai_speaker(room, current_transcript='', voice_session=None):
    """
    AutoGen-inspired AI speaker selection logic
    """
    ai_participants = RoomParticipant.objects.filter(room=room, is_ai=True)
    
    if not ai_participants.exists():
        return None
    
    # Get recent voice turns to avoid repetition
    recent_turns = []
    if voice_session:
        recent_turns = VoiceTurn.objects.filter(
            voice_session=voice_session,
            is_ai=True
        ).order_by('-started_at')[:3].values_list('ai_agent__role', flat=True)
    
    # Score each AI agent based on relevance and recency
    agent_scores = {}
    
    for participant in ai_participants:
        if not participant.ai_agent:
            continue
            
        agent = participant.ai_agent
        score = 0
        
        # Relevance scoring based on transcript content
        if current_transcript:
            role_keywords = {
                'Designer': ['design', 'ui', 'ux', 'interface', 'visual', 'layout', 'color', 'user experience'],
                'Engineer': ['code', 'develop', 'technical', 'bug', 'performance', 'database', 'api', 'architecture'],
                'Finance': ['cost', 'budget', 'revenue', 'roi', 'financial', 'money', 'profit', 'investment'],
                'Professor': ['research', 'study', 'analyze', 'theory', 'methodology', 'academic', 'framework']
            }
            
            keywords = role_keywords.get(agent.role, [])
            transcript_lower = current_transcript.lower()
            
            for keyword in keywords:
                if keyword in transcript_lower:
                    score += 2
        
        # Penalize recent speakers
        if agent.role in recent_turns:
            score -= len([role for role in recent_turns if role == agent.role]) * 3
        
        # Add some randomness
        score += random.uniform(0, 2)
        
        agent_scores[participant] = score
    
    # Select agent with highest score, but add randomness for variety
    if agent_scores:
        # Sort by score but add some randomness to top candidates
        sorted_agents = sorted(agent_scores.items(), key=lambda x: x[1], reverse=True)
        
        # Select from top 2 candidates with weighted probability
        if len(sorted_agents) >= 2:
            # 70% chance for top candidate, 30% for second
            return sorted_agents[0][0] if random.random() < 0.7 else sorted_agents[1][0]
        else:
            return sorted_agents[0][0]
    
    return random.choice(list(ai_participants))

@api_view(['POST'])
def trigger_ai_voice_response(request, room_id):
    try:
        room = get_object_or_404(Room, room_id=room_id)
        data = request.data
        
        user_transcript = data.get('transcript', '')
        voice_session_id = data.get('session_id')
        
        voice_session = None
        if voice_session_id:
            voice_session = VoiceSession.objects.filter(
                session_id=voice_session_id,
                is_active=True
            ).first()
        
        # Select AI agent to respond
        selected_participant = select_next_ai_speaker(room, user_transcript, voice_session)
        
        if not selected_participant or not selected_participant.ai_agent:
            return Response({'error': 'No AI agent available'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Generate response using OpenAI
        api_key = os.getenv('OPENAI_API_KEY') or getattr(settings, 'OPENAI_API_KEY', None)
        
        if not api_key:
            return Response({'error': 'OpenAI API key not configured'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Get conversation context
        recent_messages = Message.objects.filter(room=room).order_by('-created_at')[:10][::-1]
        context = "\n".join([f"{m.sender}: {m.content}" for m in recent_messages])
        
        # Generate text response first
        client = OpenAI(api_key=api_key)
        
        prompt = f"""You are {selected_participant.ai_agent.role} named {selected_participant.name}. 
{selected_participant.ai_agent.description}

Recent conversation context:
{context}

User just said: "{user_transcript}"

Respond as a {selected_participant.ai_agent.role} with a brief, helpful comment (1-2 sentences max). 
Keep it conversational and relevant to your expertise."""

        response = client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=100,
            temperature=0.7
        )
        
        ai_response_text = response.choices[0].message.content.strip()
        
        # Return response for Realtime API processing
        return Response({
            'ai_agent': {
                'name': selected_participant.name,
                'role': selected_participant.ai_agent.role,
                'participant_id': selected_participant.id
            },
            'response_text': ai_response_text,
            'session_id': voice_session_id
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)




def select_next_ai_speaker_advanced(room, current_transcript='', voice_session=None, recent_speakers=None):
    """
    Advanced AutoGen-inspired AI speaker selection logic
    """
    ai_participants = RoomParticipant.objects.filter(room=room, is_ai=True)
    
    if not ai_participants.exists():
        return None
    
    # Get conversation context and agent activity
    recent_turns = []
    agent_activity = defaultdict(int)
    
    if voice_session:
        # Get recent voice turns (last 10)
        recent_voice_turns = VoiceTurn.objects.filter(
            voice_session=voice_session
        ).order_by('-started_at')[:10]
        
        for turn in recent_voice_turns:
            if turn.is_ai and turn.ai_agent:
                agent_activity[turn.ai_agent.role] += 1
                recent_turns.append({
                    'role': turn.ai_agent.role,
                    'transcript': turn.transcript,
                    'timestamp': turn.started_at
                })
    
    # Also check recent chat messages for context
    recent_messages = Message.objects.filter(room=room).order_by('-created_at')[:15]
    conversation_keywords = []
    
    for msg in recent_messages:
        conversation_keywords.extend(msg.content.lower().split())
    
    # Score each AI agent
    agent_scores = {}
    
    for participant in ai_participants:
        if not participant.ai_agent:
            continue
            
        agent = participant.ai_agent
        score = 0
        
        # 1. Relevance scoring based on current transcript and conversation
        relevance_score = calculate_agent_relevance(
            agent.role, 
            current_transcript, 
            conversation_keywords
        )
        score += relevance_score * 3  # High weight for relevance
        
        # 2. Recency penalty (avoid agents who spoke recently)
        recent_penalty = agent_activity.get(agent.role, 0) * 2
        score -= recent_penalty
        
        # 3. Role diversity bonus
        if agent_activity.get(agent.role, 0) == 0:
            score += 2  # Bonus for agents who haven't spoken yet
        
        # 4. Conversation flow analysis
        flow_score = analyze_conversation_flow(agent.role, recent_turns)
        score += flow_score
        
        # 5. Random factor for natural variation
        score += random.uniform(0, 1.5)
        
        # 6. Special triggers based on keywords
        trigger_score = check_special_triggers(agent.role, current_transcript)
        score += trigger_score * 2
        
        agent_scores[participant] = score
    
    # Select agent with highest score
    if agent_scores:
        # Add some weighted randomness among top candidates
        sorted_agents = sorted(agent_scores.items(), key=lambda x: x[1], reverse=True)
        
        # Select from top 3 candidates with weighted probability
        if len(sorted_agents) >= 3:
            weights = [0.5, 0.3, 0.2]  # 50%, 30%, 20% chance
            top_candidates = sorted_agents[:3]
            selected = random.choices(top_candidates, weights=weights, k=1)[0]
            return selected[0]
        elif len(sorted_agents) >= 2:
            # 70% chance for top, 30% for second
            return sorted_agents[0][0] if random.random() < 0.7 else sorted_agents[1][0]
        else:
            return sorted_agents[0][0]
    
    return random.choice(list(ai_participants))

def calculate_agent_relevance(agent_role, transcript, conversation_keywords):
    """Calculate how relevant an agent is to the current discussion"""
    transcript_lower = transcript.lower()
    
    # Role-specific keywords and triggers
    role_keywords = {
        'Designer': {
            'primary': ['design', 'ui', 'ux', 'interface', 'visual', 'layout', 'color', 'user experience', 'wireframe', 'prototype'],
            'secondary': ['user', 'interface', 'look', 'feel', 'aesthetic', 'brand', 'style', 'graphic'],
            'triggers': ['how should it look', 'what about the design', 'user interface', 'make it pretty']
        },
        'Engineer': {
            'primary': ['code', 'develop', 'technical', 'bug', 'performance', 'database', 'api', 'architecture', 'implement'],
            'secondary': ['build', 'system', 'server', 'backend', 'frontend', 'framework', 'library', 'deploy'],
            'triggers': ['how do we build', 'technical implementation', 'what technology', 'can we code']
        },
        'Finance': {
            'primary': ['cost', 'budget', 'revenue', 'roi', 'financial', 'money', 'profit', 'investment', 'pricing'],
            'secondary': ['expensive', 'cheap', 'worth', 'value', 'market', 'business model', 'monetize'],
            'triggers': ['how much will it cost', 'is it profitable', 'business case', 'financial impact']
        },
        'Professor': {
            'primary': ['research', 'study', 'analyze', 'theory', 'methodology', 'academic', 'framework', 'data'],
            'secondary': ['evidence', 'hypothesis', 'experiment', 'literature', 'peer review', 'validate'],
            'triggers': ['what does research say', 'academic perspective', 'evidence based', 'theoretical framework']
        }
    }
    
    if agent_role not in role_keywords:
        return 0
    
    keywords = role_keywords[agent_role]
    score = 0
    
    # Check primary keywords in transcript
    for keyword in keywords['primary']:
        if keyword in transcript_lower:
            score += 3
    
    # Check secondary keywords
    for keyword in keywords['secondary']:
        if keyword in transcript_lower:
            score += 1
    
    # Check trigger phrases
    for trigger in keywords['triggers']:
        if trigger in transcript_lower:
            score += 5
    
    # Check conversation context
    conversation_text = ' '.join(conversation_keywords)
    for keyword in keywords['primary']:
        if keyword in conversation_text:
            score += 0.5
    
    return score

def analyze_conversation_flow(agent_role, recent_turns):
    """Analyze conversation flow to determine if agent should respond"""
    if not recent_turns:
        return 0
    
    # Check if there's a natural opening for this role
    last_turn = recent_turns[0] if recent_turns else None
    
    if last_turn:
        # Follow-up logic: certain roles naturally follow others
        follow_up_chains = {
            'Designer': ['Engineer'],  # Designer might follow Engineer
            'Engineer': ['Designer', 'Professor'],  # Engineer might follow Designer or Professor
            'Finance': ['Designer', 'Engineer'],  # Finance evaluates after others propose
            'Professor': ['Finance']  # Professor might analyze Finance suggestions
        }
        
        if agent_role in follow_up_chains:
            if last_turn['role'] in follow_up_chains[agent_role]:
                return 2  # Bonus for natural flow
    
    return 0

def check_special_triggers(agent_role, transcript):
    """Check for special triggers that should definitely activate certain agents"""
    transcript_lower = transcript.lower()
    
    # Question-based triggers
    if '?' in transcript:
        question_triggers = {
            'Designer': ['how should', 'what would it look like', 'design wise'],
            'Engineer': ['how do we', 'can we build', 'technically possible'],
            'Finance': ['how much', 'cost', 'affordable', 'budget'],
            'Professor': ['why', 'what research', 'evidence', 'best practice']
        }
        
        if agent_role in question_triggers:
            for trigger in question_triggers[agent_role]:
                if trigger in transcript_lower:
                    return 3
    
    # Direct mentions
    if agent_role.lower() in transcript_lower:
        return 4
    
    return 0

@api_view(['POST'])
def trigger_ai_voice_response_enhanced(request, room_id):
    """Enhanced AI voice response with better agent selection"""
    try:
        room = get_object_or_404(Room, room_id=room_id)
        data = request.data
        
        user_transcript = data.get('transcript', '')
        voice_session_id = data.get('session_id')
        force_agent_id = data.get('force_agent_id')  # Option to force specific agent
        
        voice_session = None
        if voice_session_id:
            voice_session = VoiceSession.objects.filter(
                session_id=voice_session_id,
                is_active=True
            ).first()
        
        # Enhanced agent selection
        if force_agent_id:
            # Use specific agent if requested
            selected_participant = RoomParticipant.objects.filter(
                room=room, 
                is_ai=True, 
                ai_agent_id=force_agent_id
            ).first()
        else:
            # Use advanced selection algorithm
            selected_participant = select_next_ai_speaker_advanced(
                room, 
                user_transcript, 
                voice_session
            )
        
        if not selected_participant or not selected_participant.ai_agent:
            return Response({'error': 'No AI agent available'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Generate contextual response
        ai_response_text = generate_contextual_ai_response(
            room,
            selected_participant,
            user_transcript,
            voice_session
        )
        
        # Return response for Realtime API processing
        response_data = {
            'ai_agent': {
                'name': selected_participant.name,
                'role': selected_participant.ai_agent.role,
                'participant_id': selected_participant.id,
                'agent_id': selected_participant.ai_agent.id
            },
            'response_text': ai_response_text,
            'session_id': voice_session_id,
            'confidence_score': random.uniform(0.7, 1.0),  # Placeholder for selection confidence
            'selection_reason': f"Selected based on relevance to '{user_transcript[:50]}...'"
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def generate_contextual_ai_response(room, participant, user_transcript, voice_session):
    """Generate more contextual AI responses"""
    try:
        ai_agent = participant.ai_agent
        
        # Get richer context
        recent_messages = Message.objects.filter(room=room).order_by('-created_at')[:20]
        recent_voice_turns = []
        
        if voice_session:
            recent_voice_turns = VoiceTurn.objects.filter(
                voice_session=voice_session
            ).order_by('-started_at')[:10]
        
        # Build comprehensive context
        chat_context = "\n".join([f"{m.sender}: {m.content}" for m in recent_messages[::-1]])
        voice_context = "\n".join([f"{t.speaker_name}: {t.transcript}" for t in recent_voice_turns[::-1]])
        
        # Get API key
        api_key = os.getenv('OPENAI_API_KEY') or getattr(settings, 'OPENAI_API_KEY', None)
        
        if not api_key:
            return f"As a {ai_agent.role}, I think that's an interesting point about: {user_transcript}"
        
        # Enhanced prompt with role-specific instructions
        role_instructions = get_role_specific_instructions(ai_agent.role)
        
        prompt = f"""You are {ai_agent.role} named {participant.name} in a collaborative brainstorming session.

Role Description: {ai_agent.description}
Role-Specific Instructions: {role_instructions}

Recent Chat History:
{chat_context}

Recent Voice Conversation:
{voice_context}

User just said: "{user_transcript}"

Respond as a {ai_agent.role} with a brief, insightful comment (1-2 sentences max) that:
1. Directly addresses what the user said
2. Provides value from your {ai_agent.role} perspective
3. Keeps the conversation flowing naturally
4. Is conversational and natural for voice

Your response:"""

        client = OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=80,  # Keep it brief for voice
            temperature=0.8  # More natural variation
        )
        
        return response.choices[0].message.content.strip()
        
    except Exception as e:
        print(f"Error generating contextual AI response: {str(e)}")
        return f"As a {ai_agent.role}, I find that perspective interesting. Let me think about that."

def get_role_specific_instructions(role):
    """Get specific instructions for each AI role"""
    instructions = {
        'Designer': "Focus on user experience, visual design, and interface considerations. Ask about user needs and suggest design solutions.",
        'Engineer': "Consider technical feasibility, implementation details, and system architecture. Discuss technical challenges and solutions.",
        'Finance': "Evaluate costs, revenue potential, business viability, and ROI. Provide financial perspective on decisions.",
        'Professor': "Provide research-backed insights, theoretical frameworks, and evidence-based analysis. Ask probing questions."
    }
    return instructions.get(role, "Provide helpful insights from your area of expertise.")

@api_view(['POST'])
def get_voice_conversation_summary(request, room_id):
    """Get summary of voice conversation for context"""
    try:
        room = get_object_or_404(Room, room_id=room_id)
        voice_session_id = request.data.get('session_id')
        
        if voice_session_id:
            voice_session = VoiceSession.objects.filter(
                session_id=voice_session_id,
                room=room
            ).first()
            
            if voice_session:
                turns = VoiceTurn.objects.filter(
                    voice_session=voice_session
                ).order_by('started_at')
                
                summary = {
                    'total_turns': turns.count(),
                    'participants': list(turns.values_list('speaker_name', flat=True).distinct()),
                    'ai_turns': turns.filter(is_ai=True).count(),
                    'human_turns': turns.filter(is_ai=False).count(),
                    'last_speaker': turns.last().speaker_name if turns.exists() else None,
                    'session_duration': (timezone.now() - voice_session.created_at).total_seconds()
                }
                
                return Response(summary, status=status.HTTP_200_OK)
        
        return Response({'error': 'No active voice session'}, status=status.HTTP_404_NOT_FOUND)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_voice_session_status(request, room_id, session_id):
    """Get the status of a voice session"""
    try:
        voice_session = get_object_or_404(
            VoiceSession, 
            session_id=session_id, 
            room__room_id=room_id
        )
        
        # Get recent turns count
        recent_turns_count = VoiceTurn.objects.filter(
            voice_session=voice_session
        ).count()
        
        # Calculate session duration
        duration = (timezone.now() - voice_session.created_at).total_seconds()
        
        status_data = {
            'session_id': voice_session.session_id,
            'is_active': voice_session.is_active,
            'current_speaker': voice_session.current_speaker,
            'turns_count': recent_turns_count,
            'duration_seconds': duration,
            'created_at': voice_session.created_at.isoformat(),
            'last_activity': voice_session.last_activity.isoformat()
        }
        
        return Response(status_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_voice_session_history(request, room_id, session_id):
    """Get the history of turns in a voice session"""
    try:
        voice_session = get_object_or_404(
            VoiceSession, 
            session_id=session_id, 
            room__room_id=room_id
        )
        
        turns = VoiceTurn.objects.filter(
            voice_session=voice_session
        ).order_by('started_at')
        
        history_data = []
        for turn in turns:
            turn_data = {
                'id': turn.id,
                'speaker_name': turn.speaker_name,
                'is_ai': turn.is_ai,
                'transcript': turn.transcript,
                'audio_duration': turn.audio_duration,
                'started_at': turn.started_at.isoformat(),
                'ended_at': turn.ended_at.isoformat() if turn.ended_at else None
            }
            
            if turn.ai_agent:
                turn_data['ai_agent'] = {
                    'id': turn.ai_agent.id,
                    'role': turn.ai_agent.role,
                    'description': turn.ai_agent.description
                }
            
            history_data.append(turn_data)
        
        return Response({
            'session_id': session_id,
            'total_turns': len(history_data),
            'turns': history_data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def force_ai_agent_response(request, room_id):
    """Force a specific AI agent to respond"""
    try:
        room = get_object_or_404(Room, room_id=room_id)
        data = request.data
        
        agent_id = data.get('agent_id')
        context = data.get('context', '')
        session_id = data.get('session_id')
        
        # Get the specific AI agent
        try:
            ai_agent = AIAgent.objects.get(id=agent_id)
            participant = RoomParticipant.objects.get(
                room=room, 
                ai_agent=ai_agent, 
                is_ai=True
            )
        except (AIAgent.DoesNotExist, RoomParticipant.DoesNotExist):
            return Response({
                'error': 'AI agent not found or not in this room'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Generate response using the forced agent
        ai_response_text = generate_contextual_ai_response(
            room, participant, context, None
        )
        
        response_data = {
            'ai_agent': {
                'name': participant.name,
                'role': ai_agent.role,
                'participant_id': participant.id,
                'agent_id': ai_agent.id
            },
            'response_text': ai_response_text,
            'session_id': session_id,
            'forced': True
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['PATCH'])
def update_voice_session_settings(request, room_id, session_id):
    """Update voice session settings"""
    try:
        voice_session = get_object_or_404(
            VoiceSession, 
            session_id=session_id, 
            room__room_id=room_id
        )
        
        # Update allowed settings
        session_settings = request.data
        
        # For now, we don't have specific settings fields in the model
        # This is a placeholder for future settings like:
        # - Turn detection sensitivity
        # - Maximum turn duration
        # - AI response delay
        # - Voice preferences
        
        # You could extend the VoiceSession model to include a settings JSONField
        # voice_session.settings = settings
        # voice_session.save()
        
        return Response({
            'session_id': session_id,
            'message': 'Settings update feature coming soon',
            'received_settings': session_settings
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    

@api_view(['POST'])
def trigger_ai_voice_response_realtime(request, room_id):
    """
    Enhanced AI voice response specifically optimized for Realtime API
    """
    try:
        room = get_object_or_404(Room, room_id=room_id)
        data = request.data
        
        user_transcript = data.get('transcript', '')
        voice_session_id = data.get('session_id')
        conversation_context = data.get('context', '')
        
        # Get voice session
        voice_session = None
        if voice_session_id:
            voice_session = VoiceSession.objects.filter(
                session_id=voice_session_id,
                is_active=True
            ).first()
        
        # Enhanced context gathering
        context = build_conversation_context(room, voice_session, user_transcript)
        
        # Smart AI agent selection
        selected_participant = select_optimal_ai_agent(
            room, 
            user_transcript, 
            context,
            voice_session
        )
        
        if not selected_participant or not selected_participant.ai_agent:
            return Response({'error': 'No AI agent available'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Generate optimized response for voice
        ai_response_text = generate_voice_optimized_response(
            room,
            selected_participant,
            user_transcript,
            context
        )
        
        # Response data optimized for Realtime API
        response_data = {
            'ai_agent': {
                'name': selected_participant.name,
                'role': selected_participant.ai_agent.role,
                'participant_id': selected_participant.id,
                'agent_id': selected_participant.ai_agent.id,
                'voice_settings': get_voice_settings_for_agent(selected_participant.ai_agent)
            },
            'response_text': ai_response_text,
            'session_id': voice_session_id,
            'context_used': len(context),
            'response_type': 'voice_optimized'
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"Error in realtime voice response: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def build_conversation_context(room, voice_session, current_transcript):
    """Build comprehensive conversation context"""
    context = {
        'recent_messages': [],
        'voice_turns': [],
        'current_topics': [],
        'active_participants': []
    }
    
    try:
        # Get recent chat messages
        recent_messages = Message.objects.filter(room=room).order_by('-created_at')[:10]
        context['recent_messages'] = [
            {'speaker': msg.sender, 'content': msg.content, 'is_ai': msg.is_ai}
            for msg in recent_messages[::-1]
        ]
        
        # Get recent voice turns if available
        if voice_session:
            recent_turns = VoiceTurn.objects.filter(
                voice_session=voice_session
            ).order_by('-started_at')[:8]
            
            context['voice_turns'] = [
                {
                    'speaker': turn.speaker_name, 
                    'transcript': turn.transcript,
                    'is_ai': turn.is_ai
                }
                for turn in recent_turns[::-1]
            ]
        
        # Extract topics from recent conversation
        all_text = f"{current_transcript} " + " ".join([
            msg['content'] for msg in context['recent_messages']
        ]) + " ".join([
            turn['transcript'] for turn in context['voice_turns']
        ])
        
        context['current_topics'] = extract_topics(all_text)
        
        # Get active participants
        context['active_participants'] = list(
            RoomParticipant.objects.filter(room=room).values_list('name', flat=True)
        )
        
    except Exception as e:
        print(f"Error building context: {e}")
    
    return context

def extract_topics(text):
    """Extract key topics from conversation text"""
    # Simple keyword-based topic extraction
    keywords = {
        'design': ['design', 'ui', 'ux', 'interface', 'visual', 'layout'],
        'technical': ['code', 'develop', 'api', 'database', 'performance'],
        'business': ['cost', 'revenue', 'market', 'business', 'strategy'],
        'research': ['research', 'data', 'analysis', 'study', 'evidence']
    }
    
    text_lower = text.lower()
    topics = []
    
    for topic, words in keywords.items():
        if any(word in text_lower for word in words):
            topics.append(topic)
    
    return topics

def select_optimal_ai_agent(room, transcript, context, voice_session):
    """Enhanced AI agent selection with context awareness"""
    ai_participants = RoomParticipant.objects.filter(room=room, is_ai=True)
    
    if not ai_participants.exists():
        return None
    
    # Score each agent based on multiple factors
    agent_scores = {}
    
    for participant in ai_participants:
        if not participant.ai_agent:
            continue
            
        score = 0
        agent_role = participant.ai_agent.role
        
        # 1. Topic relevance (high weight)
        topic_score = calculate_topic_relevance(agent_role, transcript, context)
        score += topic_score * 4
        
        # 2. Conversation flow analysis
        flow_score = analyze_voice_conversation_flow(agent_role, context)
        score += flow_score * 3
        
        # 3. Recency penalty (avoid same agent responding repeatedly)
        recency_penalty = calculate_recency_penalty(agent_role, context)
        score -= recency_penalty * 2
        
        # 4. Direct mentions or questions
        mention_score = check_direct_mentions(agent_role, transcript)
        score += mention_score * 5
        
        # 5. Add randomness for natural conversation
        score += random.uniform(0, 1)
        
        agent_scores[participant] = score
    
    # Select agent with highest score
    if agent_scores:
        best_agent = max(agent_scores.items(), key=lambda x: x[1])
        return best_agent[0]
    
    return random.choice(list(ai_participants))

def calculate_topic_relevance(agent_role, transcript, context):
    """Calculate how relevant an agent is to current topics"""
    role_expertise = {
        'Designer': ['design', 'ui', 'ux', 'interface', 'visual', 'user experience'],
        'Engineer': ['technical', 'code', 'development', 'implementation', 'system'],
        'Finance': ['cost', 'budget', 'business', 'revenue', 'financial'],
        'Professor': ['research', 'analysis', 'theory', 'methodology', 'study']
    }
    
    if agent_role not in role_expertise:
        return 0
    
    keywords = role_expertise[agent_role]
    text_to_analyze = f"{transcript} {' '.join(context.get('current_topics', []))}"
    text_lower = text_to_analyze.lower()
    
    relevance_score = sum(2 if keyword in text_lower else 0 for keyword in keywords)
    
    # Bonus for current topics match
    for topic in context.get('current_topics', []):
        if topic in ['design'] and agent_role == 'Designer':
            relevance_score += 3
        elif topic in ['technical'] and agent_role == 'Engineer':
            relevance_score += 3
        elif topic in ['business'] and agent_role == 'Finance':
            relevance_score += 3
        elif topic in ['research'] and agent_role == 'Professor':
            relevance_score += 3
    
    return relevance_score

def analyze_voice_conversation_flow(agent_role, context):
    """Analyze conversation flow for natural agent transitions"""
    recent_speakers = []
    
    # Get last 3 voice turns
    for turn in context.get('voice_turns', [])[-3:]:
        if turn['is_ai']:
            # Extract role from AI participants
            recent_speakers.append(turn['speaker'])
    
    # Natural follow-up patterns
    follow_patterns = {
        'Designer': ['Engineer', 'Professor'],  # Designer might follow Engineer/Professor input
        'Engineer': ['Designer', 'Finance'],    # Engineer might follow Designer/Finance requirements
        'Finance': ['Engineer', 'Designer'],    # Finance evaluates technical/design proposals
        'Professor': ['Finance', 'Engineer']    # Professor might analyze business/technical aspects
    }
    
    if recent_speakers and agent_role in follow_patterns:
        last_speaker_role = recent_speakers[-1] if recent_speakers else None
        # This is simplified - you'd need to map speaker names to roles
        # For now, give a small bonus for variety
        if len(set(recent_speakers)) < 2:  # If same agent spoke recently
            return 1  # Encourage variety
    
    return 0

def calculate_recency_penalty(agent_role, context):
    """Penalize agents who spoke very recently"""
    recent_ai_turns = [
        turn for turn in context.get('voice_turns', [])[-3:]
        if turn['is_ai']
    ]
    
    penalty = 0
    for i, turn in enumerate(recent_ai_turns):
        # This is simplified - you'd need to map speaker names to roles
        # For now, we'll penalize based on position (more recent = higher penalty)
        if turn['speaker']:  # Placeholder for role matching
            penalty += (3 - i) * 2  # Most recent gets highest penalty
    
    return penalty

def check_direct_mentions(agent_role, transcript):
    """Check for direct mentions or role-specific triggers"""
    transcript_lower = transcript.lower()
    
    # Direct role mentions
    if agent_role.lower() in transcript_lower:
        return 10
    
    # Role-specific trigger phrases
    triggers = {
        'Designer': ['how should it look', 'design this', 'user interface', 'make it pretty'],
        'Engineer': ['how do we build', 'technical solution', 'implement this', 'code this'],
        'Finance': ['how much cost', 'budget for this', 'is it profitable', 'roi'],
        'Professor': ['what research says', 'evidence for', 'best practice', 'theoretical']
    }
    
    if agent_role in triggers:
        for trigger in triggers[agent_role]:
            if trigger in transcript_lower:
                return 8
    
    # Question indicators
    if '?' in transcript_lower:
        return 2
    
    return 0

def generate_voice_optimized_response(room, participant, transcript, context):
    """Generate responses optimized for voice conversation"""
    try:
        ai_agent = participant.ai_agent
        
        # Get API key
        api_key = os.getenv('OPENAI_API_KEY') or getattr(settings, 'OPENAI_API_KEY', None)
        
        if not api_key:
            return generate_fallback_response(ai_agent.role, transcript)
        
        # Build voice-optimized prompt
        prompt = build_voice_prompt(ai_agent, participant, transcript, context)
        
        client = OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model="gpt-4o-mini",  # Use faster model for voice
            messages=[{"role": "user", "content": prompt}],
            max_tokens=60,  # Keep very brief for voice
            temperature=0.8,  # More natural variation
            presence_penalty=0.1,  # Encourage new topics
            frequency_penalty=0.1   # Reduce repetition
        )
        
        result = response.choices[0].message.content.strip()
        
        # Ensure response is voice-appropriate
        result = optimize_for_voice(result)
        
        return result
        
    except Exception as e:
        print(f"Error generating voice response: {str(e)}")
        return generate_fallback_response(ai_agent.role, transcript)

def build_voice_prompt(ai_agent, participant, transcript, context):
    """Build a prompt optimized for voice responses"""
    
    # Get recent conversation for context
    recent_context = ""
    if context.get('voice_turns'):
        recent_turns = context['voice_turns'][-3:]  # Last 3 turns
        recent_context = "\n".join([
            f"{turn['speaker']}: {turn['transcript']}"
            for turn in recent_turns
        ])
    
    current_topics = ", ".join(context.get('current_topics', []))
    
    role_instructions = {
        'Designer': "Focus on user experience, visual design, and interface. Keep responses conversational and brief.",
        'Engineer': "Address technical feasibility, implementation, and system architecture. Be practical and solution-oriented.",
        'Finance': "Evaluate costs, business impact, and financial viability. Provide business perspective concisely.",
        'Professor': "Offer research-based insights and analytical thinking. Ask thoughtful questions when appropriate."
    }
    
    instruction = role_instructions.get(ai_agent.role, "Provide helpful insights from your expertise.")
    
    prompt = f"""You are {ai_agent.role} named {participant.name} in a VOICE brainstorming session.

Role: {ai_agent.description}
Instructions: {instruction}

Current discussion topics: {current_topics}

Recent conversation:
{recent_context}

User just said: "{transcript}"

Respond as {ai_agent.role} with a brief, natural comment (15-25 words max) that:
- Sounds conversational and natural for VOICE
- Directly addresses what was said
- Adds value from your {ai_agent.role} perspective
- Keeps the conversation flowing

Response:"""

    return prompt

def optimize_for_voice(text):
    """Optimize text response for voice delivery"""
    # Remove markdown formatting
    text = text.replace('*', '').replace('_', '').replace('#', '')
    
    # Ensure it ends with proper punctuation
    if not text.endswith(('.', '!', '?')):
        text += '.'
    
    # Limit length for voice (aim for 15-30 words)
    words = text.split()
    if len(words) > 30:
        text = ' '.join(words[:25]) + '.'
    
    return text

def generate_fallback_response(role, transcript):
    """Generate fallback responses when API is unavailable"""
    fallbacks = {
        'Designer': [
            "That's an interesting point about user experience.",
            "I'd love to explore the design implications of that.",
            "From a UX perspective, that could work well."
        ],
        'Engineer': [
            "That sounds technically feasible to implement.",
            "I'm thinking about the technical architecture for that.",
            "We'd need to consider the implementation details."
        ],
        'Finance': [
            "Let me think about the business impact of that.",
            "That could have interesting financial implications.",
            "We should evaluate the cost-benefit of that approach."
        ],
        'Professor': [
            "That's worth analyzing from a research perspective.",
            "The evidence suggests that could be effective.",
            "I'd like to explore that hypothesis further."
        ]
    }
    
    responses = fallbacks.get(role, ["That's an interesting perspective."])
    return random.choice(responses)

def get_voice_settings_for_agent(ai_agent):
    """Get voice settings optimized for each AI agent"""
    voice_settings = {
        'Designer': {
            'voice': 'nova',
            'speed': 1.0,
            'temperature': 0.8
        },
        'Engineer': {
            'voice': 'alloy',
            'speed': 0.95,
            'temperature': 0.6
        },
        'Finance': {
            'voice': 'echo',
            'speed': 1.05,
            'temperature': 0.7
        },
        'Professor': {
            'voice': 'onyx',
            'speed': 0.9,
            'temperature': 0.9
        }
    }
    
    return voice_settings.get(ai_agent.role, voice_settings['Engineer'])

# Update the existing trigger_ai_voice_response to use the enhanced version
@api_view(['POST'])
def trigger_ai_voice_response(request, room_id):
    """
    Main AI voice response endpoint - now uses enhanced logic
    """
    try:
        # Use the enhanced realtime version
        return trigger_ai_voice_response_realtime(request, room_id)
        
    except Exception as e:
        # Fallback to simpler version if enhanced fails
        return trigger_ai_voice_response_simple(request, room_id)

def trigger_ai_voice_response_simple(request, room_id):
    """Simplified fallback version"""
    try:
        room = get_object_or_404(Room, room_id=room_id)
        data = request.data
        
        user_transcript = data.get('transcript', '')
        voice_session_id = data.get('session_id')
        
        # Simple agent selection
        ai_participants = RoomParticipant.objects.filter(room=room, is_ai=True)
        if not ai_participants.exists():
            return Response({'error': 'No AI agents available'}, status=status.HTTP_400_BAD_REQUEST)
        
        selected_participant = random.choice(list(ai_participants))
        
        # Simple response generation
        if not selected_participant.ai_agent:
            return Response({'error': 'AI agent not configured'}, status=status.HTTP_400_BAD_REQUEST)
        
        response_text = generate_fallback_response(
            selected_participant.ai_agent.role, 
            user_transcript
        )
        
        return Response({
            'ai_agent': {
                'name': selected_participant.name,
                'role': selected_participant.ai_agent.role,
                'participant_id': selected_participant.id
            },
            'response_text': response_text,
            'session_id': voice_session_id
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def convert_audio_to_pcm16(request):
    """
    Convert uploaded audio (M4A, MP3, etc.) to PCM16 format for OpenAI Realtime API
    FIXED: Proper file handling to prevent Windows file locking issues
    """
    if not AUDIO_CONVERSION_AVAILABLE:
        return Response({
            'error': 'Audio conversion not available. Please install required packages.'
        }, status=500)
    
    try:
        data = request.data
        audio_base64 = data.get('audio_data')
        audio_format = data.get('format', 'm4a')
        
        if not audio_base64:
            return Response({'error': 'No audio data provided'}, status=400)
        
        print(f"Converting audio: format={audio_format}, data_length={len(audio_base64)}")
        
        # Decode base64 audio
        try:
            audio_bytes = base64.b64decode(audio_base64)
        except Exception as e:
            return Response({'error': f'Invalid base64 audio data: {str(e)}'}, status=400)
        
        temp_input_path = None
        temp_output_path = None
        
        try:
            # Create temporary file for processing - use context manager for proper cleanup
            temp_input_fd, temp_input_path = tempfile.mkstemp(suffix=f'.{audio_format}')
            
            # Write audio data and immediately close the file descriptor
            with os.fdopen(temp_input_fd, 'wb') as temp_input:
                temp_input.write(audio_bytes)
            # File is now closed and can be accessed by other processes
            
            print(f"Created temp input file: {temp_input_path}")
            
            # Load and convert audio with pydub
            audio = AudioSegment.from_file(temp_input_path, format=audio_format)
            print(f"Loaded audio: duration={len(audio)}ms, channels={audio.channels}, frame_rate={audio.frame_rate}")
            
            # Convert to the format OpenAI Realtime API expects
            # 24kHz, 16-bit, mono PCM
            audio = audio.set_frame_rate(24000)  # 24kHz sample rate
            audio = audio.set_channels(1)        # Mono
            audio = audio.set_sample_width(2)    # 16-bit (2 bytes)
            
            print(f"Converted audio: duration={len(audio)}ms")
            
            # Create second temporary file for output
            temp_output_fd, temp_output_path = tempfile.mkstemp(suffix='.wav')
            os.close(temp_output_fd)  # Close immediately so pydub can write to it
            
            # Export to WAV format with PCM16 encoding
            audio.export(temp_output_path, format='wav', parameters=['-acodec', 'pcm_s16le'])
            print(f"Exported to: {temp_output_path}")
            
            # Read the converted audio as raw PCM data
            with open(temp_output_path, 'rb') as f:
                # Skip WAV header (44 bytes) to get raw PCM data
                wav_data = f.read()
                if len(wav_data) < 44:
                    raise Exception("Invalid WAV file generated")
                
                f.seek(44)  # Skip WAV header
                pcm_data = f.read()
            
            if not pcm_data:
                raise Exception("No PCM data extracted from audio")
            
            # Convert to base64 for transmission
            pcm_base64 = base64.b64encode(pcm_data).decode('utf-8')
            
            # Calculate audio duration for validation
            duration_ms = len(audio)
            
            print(f"Conversion successful: PCM data length={len(pcm_data)}, base64 length={len(pcm_base64)}")
            
            return Response({
                'success': True,
                'pcm_data': pcm_base64,
                'duration_ms': duration_ms,
                'sample_rate': 24000,
                'channels': 1,
                'bit_depth': 16,
                'original_format': audio_format,
                'pcm_bytes_length': len(pcm_data)
            })
            
        except Exception as e:
            print(f"Audio processing error: {str(e)}")
            raise
            
        finally:
            # Clean up temporary files with proper error handling
            if temp_input_path and os.path.exists(temp_input_path):
                try:
                    os.unlink(temp_input_path)
                    print(f"Cleaned up input temp file: {temp_input_path}")
                except Exception as e:
                    print(f"Warning: Could not delete temp input file {temp_input_path}: {e}")
            
            if temp_output_path and os.path.exists(temp_output_path):
                try:
                    os.unlink(temp_output_path)
                    print(f"Cleaned up output temp file: {temp_output_path}")
                except Exception as e:
                    print(f"Warning: Could not delete temp output file {temp_output_path}: {e}")
                
    except Exception as e:
        print(f"Audio conversion failed: {str(e)}")
        return Response({
            'error': f'Audio conversion failed: {str(e)}'
        }, status=500)


# Alternative conversion method using BytesIO (no temp files)
@api_view(['POST'])
def convert_audio_to_pcm16_no_temp(request):
    """
    Alternative conversion method that avoids temporary files
    """
    if not AUDIO_CONVERSION_AVAILABLE:
        return Response({
            'error': 'Audio conversion not available. Please install required packages.'
        }, status=500)
    
    try:
        data = request.data
        audio_base64 = data.get('audio_data')
        audio_format = data.get('format', 'm4a')
        
        if not audio_base64:
            return Response({'error': 'No audio data provided'}, status=400)
        
        # Decode base64 audio
        audio_bytes = base64.b64decode(audio_base64)
        
        # Use BytesIO to avoid file system issues
        audio_buffer = io.BytesIO(audio_bytes)
        
        # Load audio from buffer
        audio = AudioSegment.from_file(audio_buffer, format=audio_format)
        
        # Convert to the format OpenAI Realtime API expects
        audio = audio.set_frame_rate(24000)  # 24kHz sample rate
        audio = audio.set_channels(1)        # Mono
        audio = audio.set_sample_width(2)    # 16-bit (2 bytes)
        
        # Export to buffer instead of file
        output_buffer = io.BytesIO()
        audio.export(output_buffer, format='wav', parameters=['-acodec', 'pcm_s16le'])
        
        # Get WAV data and extract PCM
        wav_data = output_buffer.getvalue()
        if len(wav_data) < 44:
            raise Exception("Invalid WAV data generated")
        
        # Skip WAV header (44 bytes) to get raw PCM data
        pcm_data = wav_data[44:]
        
        if not pcm_data:
            raise Exception("No PCM data extracted")
        
        # Convert to base64
        pcm_base64 = base64.b64encode(pcm_data).decode('utf-8')
        duration_ms = len(audio)
        
        return Response({
            'success': True,
            'pcm_data': pcm_base64,
            'duration_ms': duration_ms,
            'sample_rate': 24000,
            'channels': 1,
            'bit_depth': 16,
            'original_format': audio_format,
            'pcm_bytes_length': len(pcm_data)
        })
        
    except Exception as e:
        return Response({
            'error': f'Audio conversion failed: {str(e)}'
        }, status=500)

@api_view(['POST'])
def realtime_audio_proxy(request):
    """
    Proxy for OpenAI Realtime API that handles audio conversion
    """
    try:
        data = request.data
        audio_base64 = data.get('audio_data')
        audio_format = data.get('format', 'm4a')
        room_id = data.get('room_id')
        session_id = data.get('session_id')
        
        # Convert audio to PCM16
        conversion_response = convert_audio_to_pcm16(request)
        if conversion_response.status_code != 200:
            return conversion_response
        
        pcm_data = conversion_response.data['pcm_data']
        duration_ms = conversion_response.data['duration_ms']
        
        # Validate audio length (OpenAI requires at least 100ms)
        if duration_ms < 100:
            return Response({
                'error': f'Audio too short: {duration_ms}ms. Minimum 100ms required.'
            }, status=400)
        
        # Here you would forward the PCM data to OpenAI Realtime API
        # For now, we'll return success with the converted data
        return Response({
            'success': True,
            'message': 'Audio converted and ready for Realtime API',
            'duration_ms': duration_ms,
            'pcm_data_length': len(pcm_data)
        })
        
    except Exception as e:
        return Response({
            'error': f'Proxy error: {str(e)}'
        }, status=500)

# Alternative approach using soundfile (sometimes more reliable)
def convert_audio_with_soundfile(audio_bytes, input_format='m4a'):
    """
    Alternative conversion method using soundfile
    """
    try:
        # Write input audio to temporary file
        with tempfile.NamedTemporaryFile(suffix=f'.{input_format}', delete=False) as temp_file:
            temp_file.write(audio_bytes)
            temp_path = temp_file.name
        
        # First convert to WAV using pydub (for format compatibility)
        audio = AudioSegment.from_file(temp_path, format=input_format)
        
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as wav_temp:
            audio.export(wav_temp.name, format='wav')
            wav_path = wav_temp.name
        
        # Now use soundfile for precise PCM conversion
        data, samplerate = sf.read(wav_path)
        
        # Ensure mono
        if len(data.shape) > 1:
            data = np.mean(data, axis=1)
        
        # Resample to 24kHz if needed
        if samplerate != 24000:
            # Simple resampling (for production, use librosa or scipy for better quality)
            ratio = 24000 / samplerate
            new_length = int(len(data) * ratio)
            data = np.interp(np.linspace(0, len(data), new_length), np.arange(len(data)), data)
        
        # Convert to 16-bit PCM
        pcm_data = (data * 32767).astype(np.int16)
        
        # Convert to bytes
        pcm_bytes = pcm_data.tobytes()
        
        # Cleanup
        os.unlink(temp_path)
        os.unlink(wav_path)
        
        return pcm_bytes
        
    except Exception as e:
        raise Exception(f"Soundfile conversion failed: {str(e)}")