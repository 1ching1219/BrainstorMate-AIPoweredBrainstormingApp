# import os
# from django.core.asgi import get_asgi_application

# os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")

# # 先調用 get_asgi_application() 來設置 Django 環境
# application = get_asgi_application()

# # 現在導入依賴 Django 環境的模組
# from channels.routing import ProtocolTypeRouter, URLRouter
# from video_api.routing import websocket_urlpatterns

# application = ProtocolTypeRouter({
#     "http": application,
#     "websocket": URLRouter(websocket_urlpatterns),
# })

import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
from django.core.asgi import get_asgi_application
django_asgi_app = get_asgi_application()
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
import video_api.routing

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AuthMiddlewareStack(
        URLRouter(
            video_api.routing.websocket_urlpatterns
        )
    ),
})