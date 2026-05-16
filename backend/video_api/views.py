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
from django.core.files.base import ContentFile
from backend import settings
from openai import OpenAI
from .ai_utils import generate_ai_response as _template_response, generate_ai_feedback as _template_feedback
from django.utils import timezone
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import random
import os
import base64


def _openai_model():
    return os.getenv('OPENAI_MODEL', 'gpt-4o')


def _extract_text_content(choice):
    """Best-effort extraction for SDK variants where content may be a string or parts list."""
    content = getattr(getattr(choice, 'message', None), 'content', None)
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, dict):
                text = item.get('text')
                if isinstance(text, str) and text.strip():
                    parts.append(text.strip())
            elif hasattr(item, 'text') and isinstance(item.text, str) and item.text.strip():
                parts.append(item.text.strip())
        return "\n".join(parts).strip()
    return ""


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
        
        model = _openai_model()
        client = OpenAI(api_key=api_key)
        print(f"[AI DEBUG] views.generate_ai_response | model={model} role={ai_agent.role} trigger={trigger_type}")
        for max_tokens in (300, 700):
            response = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                max_completion_tokens=max_tokens,
            )
            choice = response.choices[0]
            parsed_content = _extract_text_content(choice)
            print(
                f"[AI DEBUG] views response | max_tokens={max_tokens} "
                f"finish_reason={choice.finish_reason} content={repr(parsed_content)}"
            )

            if parsed_content:
                return parsed_content

            if choice.finish_reason != 'length':
                break

        print(f"[AI DEBUG] content is None/empty after retry, using template fallback")
        user_text = latest_message.get('content', '') if isinstance(latest_message, dict) else (latest_message or '')
        return _template_response(user_text, ai_agent.role)

    except Exception as e:
        print(f"[AI DEBUG] Error in views.generate_ai_response: {type(e).__name__}: {e}")
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
