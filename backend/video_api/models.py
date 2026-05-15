# video_api/models.py

from django.db import models
import string
import random

def generate_room_id(length=8):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

class AIAgent(models.Model):
    role = models.CharField(max_length=100)
    description = models.TextField()
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)  # 添加圖片欄位

    def __str__(self):
        return self.role
    


class Room(models.Model):
    room_id = models.CharField(max_length=20, unique=True, default=generate_room_id)
    name = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    ai_partners = models.JSONField(default=list, blank=True)
    participants = models.JSONField(default=list, blank=True)
    
    def __str__(self):
        return self.room_id

class RoomParticipant(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='room_participants')
    name = models.CharField(max_length=100)
    is_ai = models.BooleanField(default=False)
    ai_agent = models.ForeignKey(AIAgent, null=True, blank=True, on_delete=models.SET_NULL)
    
    def __str__(self):
        return f"{self.name} in {self.room.room_id}"


class Message(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='messages')
    sender = models.CharField(max_length=100)
    content = models.TextField()
    is_ai = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.sender}: {self.content[:20]}..."
    
