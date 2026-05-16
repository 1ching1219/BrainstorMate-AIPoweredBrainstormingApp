# Add these to your urls.py

from django.urls import path
from . import views
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    # Basic room operations
    path('rooms/<str:room_id>/join/', views.join_room, name='join-room'),
    path('rooms/<str:room_id>/messages/', views.get_room_messages, name='room-messages'),
    path('rooms/<str:room_id>/participants/', views.get_room_participants, name='room-participants'),
    path('rooms/create/', views.create_room, name='create-room'),
    path('rooms/<str:room_id>/ai-partners/', views.ai_partners_view),
    path('rooms/<str:room_id>/participants', views.add_participant),
    path('ai-agents/', views.list_ai_agents),
    path('save-ai/', views.save_ai_partner, name='save-ai-partners'),
    path('rooms/<str:room_id>/', views.get_room, name='get-room'),
    path('test-media/', views.test_media_files, name='test-media'),
    path('test-upload/', views.test_upload, name='test-upload'),
    path('save-ai-base64/', views.save_ai_partner_base64, name='save-ai-base64'),
    path('ai-agents/<int:agent_id>/update/', views.update_ai_agent, name='update-ai-agent'),
    path('ai-agents/<int:agent_id>/delete/', views.delete_ai_agent, name='delete-ai-agent'),
    
    # AI response operations
    path('rooms/<str:room_id>/ai_respond/', views.ai_respond, name='ai_respond'),
    path('rooms/<str:room_id>/ai_scheduled/', views.trigger_scheduled_ai_response, name='ai_scheduled'),
    
    # Essential voice operations
    path('rooms/<str:room_id>/voice/create-session/', views.create_voice_session, name='create-voice-session'),
    path('rooms/<str:room_id>/voice/end-session/<str:session_id>/', views.end_voice_session, name='end-voice-session'),
    path('rooms/<str:room_id>/voice/turn/', views.handle_voice_turn, name='voice-turn'),
    
    # Enhanced voice operations
    path('rooms/<str:room_id>/voice/ai-response/', views.trigger_ai_voice_response, name='ai-voice-response'),
    path('rooms/<str:room_id>/voice/ai-response-realtime/', views.trigger_ai_voice_response_realtime, name='ai-voice-response-realtime'),
    
    # NEW: Audio conversion endpoints
    path('convert-audio-to-pcm16/', views.convert_audio_to_pcm16, name='convert-audio-to-pcm16'),
    path('convert-audio-to-pcm16-no-temp/', views.convert_audio_to_pcm16_no_temp, name='convert-audio-to-pcm16-no-temp'),
    path('realtime-audio-proxy/', views.realtime_audio_proxy, name='realtime-audio-proxy'),
    
    # Additional voice operations
    path('rooms/<str:room_id>/voice/session/<str:session_id>/status/', views.get_voice_session_status, name='voice-session-status'),
    path('rooms/<str:room_id>/voice/session/<str:session_id>/history/', views.get_voice_session_history, name='voice-session-history'),
    path('rooms/<str:room_id>/voice/force-agent-response/', views.force_ai_agent_response, name='force-agent-response'),
    path('rooms/<str:room_id>/voice/session/<str:session_id>/settings/', views.update_voice_session_settings, name='update-voice-session-settings'),
    path('rooms/<str:room_id>/voice/conversation-summary/', views.get_voice_conversation_summary, name='voice-conversation-summary'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)