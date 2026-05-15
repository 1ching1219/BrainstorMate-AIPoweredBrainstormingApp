# In video_api/urls.py

from django.urls import path
from . import views

urlpatterns = [
    path('rooms/<str:room_id>/join/', views.join_room, name='join-room'),
    path('rooms/<str:room_id>/messages/', views.get_room_messages, name='room-messages'),
    path('rooms/<str:room_id>/participants/', views.get_room_participants, name='room-participants'),
    path('rooms/create/', views.create_room, name='create-room'),
    path('rooms/<str:room_id>/ai-partners/', views.ai_partners_view),
    path('rooms/<str:room_id>/add-participant/', views.add_participant, name='add-participant'),
    path('ai-agents/', views.list_ai_agents),
    path('save-ai/', views.save_ai_partner, name='save-ai-partners'),
    path('rooms/<str:room_id>/', views.get_room, name='get-room'),
    path('rooms/<str:room_id>/ai_respond/', views.ai_respond, name='ai_respond'),
]

