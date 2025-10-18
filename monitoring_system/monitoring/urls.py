# urls.py
from django.urls import path, include
from django.views.decorators.csrf import ensure_csrf_cookie
from django.http import JsonResponse
from rest_framework.routers import DefaultRouter
from . import views
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

router = DefaultRouter()
router.register(r'agents', views.MonitoringAgentViewSet)
router.register(r'logs', views.SystemLogViewSet, basename='logs')
router.register(r'alerts', views.AlertViewSet)
router.register(r'sessions', views.UserSessionViewSet)
router.register(r'registrations', views.AgentRegistrationViewSet, basename='registrations')
router.register(r'metrics', views.HostMetricViewSet, basename='metrics')
router.register(r'processes', views.ProcessViewSet, basename='processes')
router.register(r'thresholds', views.ResourceThresholdViewSet)
router.register(r'notifications', views.NotificationChannelViewSet)
router.register(r'alerts', views.AlertViewSet, basename='alerts')


# CSRF token endpoint
@ensure_csrf_cookie
def get_csrf_token(request):
    return JsonResponse({'detail': 'CSRF cookie set'})

urlpatterns = [
    path('', include(router.urls)),
    path('csrf/', get_csrf_token, name='csrf-token'),  # Add this line
    path('agent/config/', views.MonitoringAgentViewSet.as_view({'get': 'config_by_hostname'}), name='agent-config'),
    path('agent/register/', views.AgentRegistrationViewSet.as_view({'post': 'create'}), name='agent-register'),
    path('metrics/upload/', views.HostMetricViewSet.as_view({'post': 'upload_metrics'}), name='metrics-upload'),
    path('processes/upload/', views.ProcessViewSet.as_view({'post': 'upload_processes'}), name='processes-upload'),
    path('processes/list/', views.ProcessViewSet.as_view({'get': 'get_processes'}), name='processes-list'),
    path('api/auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]