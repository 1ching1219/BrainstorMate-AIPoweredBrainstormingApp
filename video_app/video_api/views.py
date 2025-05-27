from django.shortcuts import render
import openai

# Create your views here.
# video_api/views.py

from rest_framework import viewsets, status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import AIAgent, Room, RoomParticipant, Message
from .serializers import AIAgentSerializer, RoomSerializer, RoomParticipantSerializer, MessageSerializer
from django.shortcuts import get_object_or_404
from rest_framework.request import Request
from django.http import HttpRequest
from rest_framework.parsers import MultiPartParser, FormParser

openai.api_key = "place the key here"  # Use env var in production!

class AIAgentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AIAgent.objects.all()
    serializer_class = AIAgentSerializer

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
    serializer = AIAgentSerializer(agents, many=True)
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

# 新增存AI
@api_view(['POST'])
def save_ai_partner(request):
    parser_classes = (MultiPartParser, FormParser)
    role = request.data.get('role')
    description = request.data.get('description')
    avatar = request.FILES.get('avatar')

    print('Received data:', role, description, avatar)

    if not role or not description:
        return Response({'error': 'Role and description are required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        ai_agent = AIAgent.objects.create(role=role, description=description, avatar=avatar)
        return Response({'success': True, 'ai_agent_id': ai_agent.id}, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({'error': 'Failed to save AI partner.', 'details': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_room(request, room_id):
    try:
        room = Room.objects.get(room_id=room_id)
        serializer = RoomSerializer(room)
        return Response(serializer.data)
    except Room.DoesNotExist:
        return Response({'error': 'Room not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
def ai_respond(request, room_id):
    try:
        print("=== Debug Info ===")
        print(f"Room ID: {room_id}")
        latest_message = request.data['message']
        print(f"Latest message: {latest_message}")
        
        # Fetch room using string room_id
        room = Room.objects.get(room_id=room_id)
        print(f"Room found: {room}")
        
        # Get AI participants
        ai_agents = RoomParticipant.objects.filter(room=room, is_ai=True)
        print(f"AI participants found: {ai_agents.count()}")
        
        if not ai_agents.exists():
            print("No AI participants found, checking room's ai_partners")
            if room.ai_partners:
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
        
        responses = []
        for participant in ai_agents:
            try:
                if not participant.ai_agent:
                    print(f"Warning: Participant {participant.name} has no AI agent assigned")
                    continue
                    
                ai_agent = participant.ai_agent
                print(f"Found AI agent: {ai_agent.role}")
                
                # Fetch chat history
                history = Message.objects.filter(room=room).order_by('-created_at')[:10][::-1]
                history_text = "\n".join([f"{m.sender}: {m.content}" for m in history])
                
                # Compose prompt
                prompt = (
                    f"You are {ai_agent.role} named {participant.name}. {ai_agent.description}\n"
                    f"Here is the recent chat history:\n{history_text}\n"
                    f"Latest message from {latest_message['sender']}: {latest_message['content']}\n"
                    "Respond as an expert in your field."
                )
                
                # Updated OpenAI API call with new format
                client = openai.OpenAI(api_key=openai.api_key)
                response = client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": prompt}
                    ]
                )
                
                ai_message = response.choices[0].message.content
                
                # Save the message to database
                message = Message.objects.create(
                    room=room,
                    sender=participant.name,
                    content=ai_message,
                    is_ai=True
                )
                
                responses.append({
                    "message": ai_message,
                    "sender": participant.name,
                    "is_ai": True
                })
                
            except Exception as e:
                print(f"Error processing AI agent {participant.name}: {str(e)}")
                continue
            
        return Response(responses)
        
    except Room.DoesNotExist:
        print(f"Room {room_id} not found")
        return Response({"error": "Room not found"}, status=404)
    except Exception as e:
        print(f"Error in ai_respond: {str(e)}")
        return Response({"error": str(e)}, status=400)