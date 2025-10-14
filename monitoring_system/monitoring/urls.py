from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'agents', views.MonitoringAgentViewSet)
router.register(r'logs', views.SystemLogViewSet, basename='logs')
router.register(r'alerts', views.AlertViewSet)
router.register(r'sessions', views.UserSessionViewSet)

urlpatterns = [
    path('', include(router.urls)),
]