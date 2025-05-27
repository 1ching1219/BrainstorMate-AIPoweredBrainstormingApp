from rest_framework import serializers
from .models import AIAgent, Room, RoomParticipant, Message

class AIAgentSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIAgent
        fields = '__all__'

class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = '__all__'
        read_only_fields = ['room_id']

class RoomParticipantSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoomParticipant
        fields = ['name', 'is_ai', 'ai_agent']

    def validate(self, data):
        if data.get('is_ai') and not data.get('ai_agent'):
            raise serializers.ValidationError("AI 參與者必須指定 ai_agent。")
        return data

class MessageSerializer(serializers.ModelSerializer):
    # look up Room by its `room_id` string instead of numeric PK
    room = serializers.SlugRelatedField(
        queryset=Room.objects.all(),
        slug_field='room_id'
    )

    class Meta:
        model = Message
        fields = ('id', 'room', 'sender', 'content', 'is_ai', 'created_at')
        read_only_fields = ('id', 'created_at')
