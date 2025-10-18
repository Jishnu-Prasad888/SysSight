# views.py - Fixed version
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from .models import MonitoringAgent, SystemLog, Alert, UserSession, AgentRegistrationRequest, HostMetric, ProcessSnapshot, ResourceThreshold, NotificationChannel
from .serializers import *
from .utils import EncryptionManager, AlertGenerator
import logging
from datetime import datetime, timedelta
import json
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import requests
import threading
from colorama import Fore , init
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.views import APIView


init(autoreset=True)

logger = logging.getLogger(__name__)

class MonitoringAgentViewSet(viewsets.ModelViewSet):
    queryset = MonitoringAgent.objects.all()
    serializer_class = MonitoringAgentSerializer
    
    def get_permissions(self):
        """Allow agents to check config without frontend authentication"""
        if self.action == 'config_by_hostname':
            return [AllowAny()]
        return [IsAuthenticated()]
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get agent statistics"""
        try:
            total_agents = MonitoringAgent.objects.count()
            active_agents = MonitoringAgent.objects.filter(is_active=True, is_approved=True).count()
            pending_registrations = AgentRegistrationRequest.objects.filter(status='pending').count()
            
            recent_logs_count = SystemLog.objects.filter(
                timestamp__gte=timezone.now() - timedelta(hours=24)
            ).count()
            
            alerts_count = Alert.objects.filter(resolved=False).count()
            
            stats = {
                'total_agents': total_agents,
                'active_agents': active_agents,
                'pending_registrations': pending_registrations,
                'recent_logs_count': recent_logs_count,
                'alerts_count': alerts_count,
            }
            return Response(stats)
        except Exception as e:
            return Response({
                'total_agents': 0,
                'active_agents': 0,
                'pending_registrations': 0,
                'recent_logs_count': 0,
                'alerts_count': 0,
                'error': str(e)
            })

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve an agent (for re-approving disapproved agents)"""
        agent = self.get_object()

        try:
            # Approve and activate the agent
            agent.is_approved = True
            agent.is_active = True
            agent.save()

            logger.info(f"Agent {agent.hostname} approved")

            # Optionally create an Alert
            from .models import Alert
            Alert.objects.create(
                agent=agent,
                title=f"Agent Approved: {agent.hostname}",
                description=f"Agent has been approved and activated.",
                level='low',
                alert_type='system'
            )

            return Response({
                'status': 'approved',
                'message': 'Agent has been approved and activated',
                'agent_id': agent.id
            })

        except Exception as e:
            logger.error(f"Agent approval error: {str(e)}")
            return Response(
                {'error': 'Approval failed', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
            
            
    @action(detail=True, methods=['post'])
    def disapprove(self, request, pk=None):
        """Disapprove and deactivate an agent"""
        agent = self.get_object()
        reason = request.data.get('reason', '')

        try:
            # Deactivate the agent but keep it in the system
            agent.is_approved = False  # Set to pending approval
            agent.is_active = False     # Deactivate it
            agent.save()

            # Optionally log the reason
            logger.info(f"Agent {agent.hostname} disapproved. Reason: {reason}")

            # Create an Alert for tracking
            from .models import Alert
            Alert.objects.create(
                agent=agent,
                title=f"Agent Disapproved: {agent.hostname}",
                description=f"Agent was disapproved and requires re-approval. Reason: {reason}",
                level='medium',
                alert_type='system'
            )

            return Response({
                'status': 'disapproved',
                'message': 'Agent has been disapproved and set to pending approval',
                'agent_id': agent.id
            })

        except Exception as e:
            logger.error(f"Disapproval error: {str(e)}")
            return Response(
                {'error': 'Disapproval failed', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate an agent"""
        agent = self.get_object()
        agent.is_active = True
        agent.save()
        return Response({'status': 'agent activated'})
    
    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Deactivate an agent"""
        agent = self.get_object()
        agent.is_active = False
        agent.save()
        return Response({'status': 'agent deactivated'})
    
    # @action(detail=True, methods=['post'])
    # def approve(self, request, pk=None):
    #     """Approve an agent registration"""
    #     agent = self.get_object()
    #     agent.is_approved = True
    #     agent.save()
    #     return Response({'status': 'agent approved'})
    
    @action(detail=True, methods=['get'])
    def config(self, request, pk=None):
        """Get agent configuration"""
        agent = self.get_object()
        config = {
            'is_active': agent.is_active,
            'is_approved': agent.is_approved,
            'monitoring_scope': agent.monitoring_scope,
            'interval': 60,
            'config_version': agent.config_version,
        }
        return Response(config)
    
    @action(detail=False, methods=['get'])
    def config_by_hostname(self, request):
        """Get agent configuration by hostname"""
        hostname = request.query_params.get('hostname')
        if not hostname:
            return Response({'error': 'hostname parameter required'}, status=400)
        
        try:
            agent = MonitoringAgent.objects.get(hostname=hostname)
            config = {
                'is_active': agent.is_active,
                'is_approved': agent.is_approved,
                'monitoring_scope': agent.monitoring_scope,
                'interval': 60,
                'config_version': agent.config_version,
            }
            return Response(config)
        except MonitoringAgent.DoesNotExist:
            return Response({'error': 'Agent not found'}, status=404)

class AgentRegistrationViewSet(viewsets.ModelViewSet):
    """Handle agent registration requests"""
    queryset = AgentRegistrationRequest.objects.all().order_by('-requested_at')
    serializer_class = AgentRegistrationRequestSerializer
    
    def get_permissions(self):
        """Allow unauthenticated access only for registration creation"""
        if self.action in ['create']:
            return [AllowAny()]
        return [IsAuthenticated()]
    
    def get_queryset(self):
        """Filter queryset based on user permissions"""
        queryset = super().get_queryset()

        # Staff users can see all requests
        if self.request.user.is_staff:
            return queryset

        # Authenticated non-staff users can see pending requests
        if self.request.user.is_authenticated:
            return queryset.filter(status='pending')

        # Unauthenticated users see nothing
        return queryset.none()
    
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get pending registration requests"""
        pending_requests = AgentRegistrationRequest.objects.filter(status='pending')
        serializer = self.get_serializer(pending_requests, many=True)
        return Response(serializer.data)

    def create(self, request):
        """Handle new agent registration"""
        serializer = RegistrationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            data = serializer.validated_data
            
            # Check if agent already exists
            if MonitoringAgent.objects.filter(hostname=data['hostname']).exists():
                return Response({
                    'error': 'Agent with this hostname already registered'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if pending registration already exists
            if AgentRegistrationRequest.objects.filter(
                hostname=data['hostname'], 
                status='pending'
            ).exists():
                return Response({
                    'error': 'Registration request already pending for this hostname'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Create registration request
            registration = AgentRegistrationRequest.objects.create(
                hostname=data['hostname'],
                username=data['username'],
                ip_address=data['ip_address'],
                encryption_password=data['encryption_password'],
                status='pending'
            )
            
            return Response({
                'status': 'registration_pending',
                'message': 'Registration request submitted for approval',
                'request_id': registration.id
            })
            
        except Exception as e:
            logger.error(f"Registration error: {str(e)}")
            return Response(
                {'error': 'Registration failed', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a registration request"""
        registration = self.get_object()
        
        try:
            # Check if agent already exists
            if MonitoringAgent.objects.filter(hostname=registration.hostname).exists():
                return Response({
                    'error': 'Agent with this hostname already exists'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Create the agent
            agent = MonitoringAgent.objects.create(
                hostname=registration.hostname,
                username=registration.username,
                ip_address=registration.ip_address,
                encryption_password=registration.encryption_password,
                is_approved=True,
                is_active=True,
                monitoring_scope='all_users'
            )
            
            # Update registration status
            registration.status = 'approved'
            registration.save()
            
            return Response({
                'status': 'approved',
                'agent_id': agent.id,
                'message': 'Agent approved and created successfully'
            })
            
        except Exception as e:
            logger.error(f"Approval error: {str(e)}")
            return Response(
                {'error': 'Approval failed', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a registration request"""
        registration = self.get_object()
        registration.status = 'rejected'
        registration.notes = request.data.get('notes', '')
        registration.save()
        
        return Response({'status': 'rejected'})

class SystemLogViewSet(viewsets.ModelViewSet):
    queryset = SystemLog.objects.all().order_by('-timestamp')
    serializer_class = SystemLogSerializer
    
    def get_permissions(self):
        """Customize permissions per action"""
        if self.action in ['upload_logs', 'create']:
            # Allow anyone to upload logs or create
            permission_classes = [AllowAny]
        elif self.action in ['list', 'retrieve', 'update', 'partial_update', 'destroy']:
            # Restrict these actions to admins
            permission_classes = [IsAdminUser]
        else:
            # Default fallback — authenticated users only
            permission_classes = [IsAuthenticated]

        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by agent if provided
        agent_id = self.request.query_params.get('agent_id')
        if agent_id:
            queryset = queryset.filter(agent_id=agent_id)
        
        # Filter by time range
        hours = self.request.query_params.get('hours', 24)
        time_threshold = timezone.now() - timedelta(hours=int(hours))
        queryset = queryset.filter(timestamp__gte=time_threshold)
        
        return queryset
    
    @action(detail=False, methods=['post'])
    def upload_logs(self, request):
        """Handle encrypted log uploads from monitoring agents"""
        try:
            data = request.data
            logger.info(f"Received log upload request with keys: {list(data.keys())}")
            
            # Get required fields
            hostname = data.get('hostname')
            username = data.get('username')
            
            if not hostname:
                return Response({'error': 'hostname is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Get agent
            try:
                agent = MonitoringAgent.objects.get(hostname=hostname)
            except MonitoringAgent.DoesNotExist:
                return Response({
                    'error': 'Agent not registered or approved'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Check if agent is allowed to send logs
            if not agent.can_send_logs():
                return Response({
                    'error': 'Agent is not active or approved',
                    'is_active': agent.is_active,
                    'is_approved': agent.is_approved
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Determine if data is encrypted or not
            log_entries = []
            
            if 'encrypted_data' in data:
                # Decrypt the data
                try:
                    encryption_mgr = EncryptionManager(
                        password=agent.get_encryption_password(),
                        salt=agent.encryption_salt
                    )
                    decrypted_data = encryption_mgr.decrypt_data(data['encrypted_data'])
                    logger.info("Successfully decrypted data")
                    
                    # Decrypted data should be a list or single dict
                    if isinstance(decrypted_data, list):
                        log_entries = decrypted_data
                    elif isinstance(decrypted_data, dict):
                        log_entries = [decrypted_data]
                    else:
                        raise ValueError(f"Unexpected decrypted data type: {type(decrypted_data)}")
                        
                except Exception as decryption_error:
                    logger.error(f"Decryption failed: {decryption_error}")
                    return Response({
                        'error': 'Decryption failed - check encryption credentials'
                    }, status=status.HTTP_400_BAD_REQUEST)
                    
            elif 'logs' in data:
                # Unencrypted data
                logger.info("Processing unencrypted logs")
                logs_data = data['logs']
                
                if isinstance(logs_data, list):
                    log_entries = logs_data
                elif isinstance(logs_data, dict):
                    log_entries = [logs_data]
                else:
                    return Response({
                        'error': f'Invalid logs format, expected list or dict, got {type(logs_data)}'
                    }, status=status.HTTP_400_BAD_REQUEST)
            else:
                return Response({
                    'error': 'Either encrypted_data or logs field is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            logger.info(f"Processing {len(log_entries)} log entries")
            
            # Process the logs
            logs_processed = 0
            alerts_generated = 0
            metrics_saved = 0
            sessions_saved = 0
            
            for log_entry in log_entries:
                try:
                    # Ensure log_entry is a dict
                    if not isinstance(log_entry, dict):
                        logger.warning(f"Skipping non-dict log entry: {type(log_entry)}")
                        continue
                    
                    # Parse timestamp
                    timestamp = log_entry.get('timestamp')
                    if isinstance(timestamp, str):
                        timestamp = timestamp.replace('Z', '+00:00')
                        try:
                            timestamp = datetime.fromisoformat(timestamp)
                        except ValueError:
                            timestamp = datetime.strptime(timestamp, '%Y-%m-%dT%H:%M:%S.%f')
                        
                        if timezone.is_naive(timestamp):
                            timestamp = timezone.make_aware(timestamp)
                    elif timestamp is None:
                        timestamp = timezone.now()
                    
                    # Save system log
                    system_log = SystemLog.objects.create(
                        agent=agent,
                        timestamp=timestamp,
                        data=log_entry
                    )
                    logs_processed += 1
                    
                    # Extract and save host metrics from resource_anomalies
                    resource_data = log_entry.get('resource_anomalies', {})
                    if resource_data:
                        try:
                            # Get network data
                            network_data = log_entry.get('network_connection', {})
                            
                            # Get disk usage percentage from resource_anomalies
                            disk_percent = resource_data.get('disk_percent', 0.0)
                            
                            # Calculate disk totals (assuming disk_percent is accurate)
                            disk_read_bytes = resource_data.get('disk_read_bytes', 0)
                            disk_write_bytes = resource_data.get('disk_write_bytes', 0)
                            
                            # Estimate disk total and used from percentage
                            # This is an approximation - adjust if you have actual values
                            estimated_disk_total = 1000 * 1024 * 1024 * 1024  # 1TB default
                            disk_used = int(estimated_disk_total * (disk_percent / 100))
                            
                            # Get memory data
                            memory_percent = resource_data.get('memory_percent', 0.0)
                            # Estimate memory total (adjust based on your systems)
                            estimated_memory_total = 16 * 1024 * 1024 * 1024  # 16GB default
                            memory_used = int(estimated_memory_total * (memory_percent / 100))
                            
                            host_metric = HostMetric.objects.create(
                                agent=agent,
                                timestamp=timestamp,
                                cpu_usage=resource_data.get('cpu_percent', 0.0),
                                memory_usage=memory_percent,
                                memory_total=estimated_memory_total,
                                memory_used=memory_used,
                                disk_usage=disk_percent,
                                disk_total=estimated_disk_total,
                                disk_used=disk_used,
                                network_sent=network_data.get('bytes_sent', 0),
                                network_received=network_data.get('bytes_recv', 0)
                            )
                            metrics_saved += 1
                            
                            # Check thresholds and generate alerts if needed
                            self._check_resource_thresholds(agent, host_metric)
                            
                        except Exception as metric_error:
                            logger.error(f"Error saving host metric: {metric_error}")
                    
                    # Save user sessions
                    users_data = log_entry.get('users_logged_in', {})
                    if isinstance(users_data, dict):
                        users_list = users_data.get('users', [])
                        for user_data in users_list:
                            try:
                                login_time = user_data.get('started', 0)
                                if isinstance(login_time, (int, float)):
                                    if login_time > 0:
                                        login_time = datetime.fromtimestamp(login_time, tz=timezone.utc)
                                    else:
                                        login_time = timestamp
                                    
                                    if timezone.is_naive(login_time):
                                        login_time = timezone.make_aware(login_time)
                                
                                # Normalize host address
                                host = user_data.get('host', '0.0.0.0')
                                if host in [':1', '::1']:
                                    host = '127.0.0.1'
                                elif not host or host == ':0.0.0.0' or host.startswith(':'):
                                    host = '0.0.0.0'
                                
                                # Check if session already exists
                                session_exists = UserSession.objects.filter(
                                    agent=agent,
                                    username=user_data.get('name', 'unknown'),
                                    pid=user_data.get('pid', 0),
                                    login_time=login_time
                                ).exists()
                                
                                if not session_exists:
                                    UserSession.objects.create(
                                        agent=agent,
                                        username=user_data.get('name', 'unknown'),
                                        terminal=user_data.get('terminal', 'unknown'),
                                        host=host,
                                        login_time=login_time,
                                        pid=user_data.get('pid', 0)
                                    )
                                    sessions_saved += 1
                                    
                            except Exception as user_error:
                                logger.warning(f"Error saving user session: {user_error}")
                    
                    # Save process snapshot if available
                    process_data = log_entry.get('process_system_activity', {})
                    if process_data:
                        try:
                            # Store complete process information
                            processes_info = {
                                'total_processes': process_data.get('total_processes', 0),
                                'root_processes': process_data.get('root_processes', 0),
                                'top_cpu_processes': process_data.get('top_cpu_processes', []),
                                'top_memory_processes': process_data.get('top_memory_processes', []),
                                'load_average': process_data.get('load_average', [])
                            }
                            
                            ProcessSnapshot.objects.create(
                                agent=agent,
                                timestamp=timestamp,
                                processes=processes_info
                            )
                        except Exception as process_error:
                            logger.warning(f"Error saving process snapshot: {process_error}")
                    
                    # Generate security alerts
                    try:
                        alerts = self._generate_security_alerts(agent, log_entry, timestamp)
                        alerts_generated += len(alerts)
                    except Exception as alert_error:
                        logger.error(f"Error generating alerts: {alert_error}")
                    
                except Exception as log_error:
                    logger.error(f"Error processing log entry: {log_error}")
                    import traceback
                    logger.error(f"Traceback: {traceback.format_exc()}")
                    continue
            
            logger.info(f"Successfully processed {logs_processed} logs, saved {metrics_saved} metrics, {sessions_saved} sessions, generated {alerts_generated} alerts")
            
            return Response({
                'status': 'success',
                'agent_id': agent.id,
                'agent_hostname': agent.hostname,
                'logs_processed': logs_processed,
                'metrics_saved': metrics_saved,
                'sessions_saved': sessions_saved,
                'alerts_generated': alerts_generated
            })
            
        except Exception as e:
            logger.error(f"Error processing log upload: {str(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return Response(
                {'error': 'Failed to process logs', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    

    def _generate_security_alerts(self, agent, log_entry, timestamp):
        """Generate security alerts based on log data"""
        alerts_created = []

        try:
            # Check authentication issues
            auth_data = log_entry.get('authentication', {})
            failed_logins = auth_data.get('failed_login_attempts', 0)

            if failed_logins > 5:
                alert = self._create_alert_if_not_exists(
                    agent=agent,
                    title="High failed login attempts",
                    description=f"Detected {failed_logins} failed login attempts on {agent.hostname}",
                    level='high',
                    alert_type='authentication',
                    metadata={'failed_attempts': failed_logins},
                    timestamp=timestamp
                )
                if alert:
                    alerts_created.append(alert)

            # Check privilege escalation
            privilege_escalation = auth_data.get('privilege_escalation', 0)
            if privilege_escalation > 50:
                alert = self._create_alert_if_not_exists(
                    agent=agent,
                    title="Excessive privilege escalation",
                    description=f"Detected {privilege_escalation} privilege escalation events on {agent.hostname}",
                    level='medium',
                    alert_type='security',
                    metadata={'escalation_count': privilege_escalation},
                    timestamp=timestamp
                )
                if alert:
                    alerts_created.append(alert)

            # Check for suspicious processes
            anomaly_data = log_entry.get('anomaly_threat_detection', {})
            suspicious_processes = anomaly_data.get('suspicious_processes', 0)

            if suspicious_processes > 10:
                alert = self._create_alert_if_not_exists(
                    agent=agent,
                    title="Suspicious processes detected",
                    description=f"Detected {suspicious_processes} suspicious processes on {agent.hostname}",
                    level='high',
                    alert_type='process',
                    metadata={'suspicious_count': suspicious_processes},
                    timestamp=timestamp
                )
                if alert:
                    alerts_created.append(alert)

            # Check zombie processes
            resource_data = log_entry.get('resource_anomalies', {})
            zombie_count = resource_data.get('zombie_processes', 0)

            if zombie_count > 5:
                alert = self._create_alert_if_not_exists(
                    agent=agent,
                    title="High zombie process count",
                    description=f"Detected {zombie_count} zombie processes on {agent.hostname}",
                    level='medium',
                    alert_type='process',
                    metadata={'zombie_count': zombie_count},
                    timestamp=timestamp
                )
                if alert:
                    alerts_created.append(alert)

            # Check network anomalies
            network_data = log_entry.get('network_connection', {})
            if network_data.get('suspicious_connections', 0) > 0:
                alert = self._create_alert_if_not_exists(
                    agent=agent,
                    title="Suspicious network connections detected",
                    description=f"Detected suspicious network connections on {agent.hostname}",
                    level='high',
                    alert_type='network',
                    metadata={'suspicious_connections': network_data.get('suspicious_connections', 0)},
                    timestamp=timestamp
                )
                if alert:
                    alerts_created.append(alert)

        except Exception as e:
            logger.error(f"Error generating security alerts: {e}")

        return alerts_created


    def _create_alert_if_not_exists(self, agent, title, description, level, alert_type='system', metadata=None, timestamp=None):
        """Create alert only if similar alert doesn't exist recently"""
        recent_time = timezone.now() - timedelta(minutes=30)
        
        # Check for existing similar unresolved alerts
        existing = Alert.objects.filter(
            agent=agent,
            title=title,
            resolved=False,
            triggered_at__gte=recent_time
        ).exists()
        
        if not existing:
            alert_data = {
                'agent': agent,
                'title': title,
                'description': description,
                'level': level,
                'alert_type': alert_type,
                'triggered_at': timestamp or timezone.now(),
                'resolved': False
            }
            
            if metadata:
                alert_data['metadata'] = metadata
                
            alert = Alert.objects.create(**alert_data)
            logger.info(f"Created alert: {title} (Level: {level}, Type: {alert_type})")
            return alert
        
        return None
    
    def _check_resource_thresholds(self, agent, metric):
        """Check resource thresholds and generate alerts"""
        thresholds = ResourceThreshold.objects.filter(is_active=True)
        
        for threshold in thresholds:
            try:
                should_alert = False
                current_value = 0
                resource_type = ''
                
                if threshold.resource_type == 'cpu' and metric.cpu_usage > threshold.threshold_value:
                    should_alert = True
                    current_value = metric.cpu_usage
                    resource_type = 'CPU'
                
                elif threshold.resource_type == 'memory' and metric.memory_usage > threshold.threshold_value:
                    should_alert = True
                    current_value = metric.memory_usage
                    resource_type = 'Memory'
                
                elif threshold.resource_type == 'disk' and metric.disk_usage > threshold.threshold_value:
                    should_alert = True
                    current_value = metric.disk_usage
                    resource_type = 'Disk'
                
                if should_alert:
                    alert_level = 'critical' if current_value > 95 else 'high' if current_value > 85 else 'medium'
                    
                    self._create_alert_if_not_exists(
                        agent=agent,
                        title=f"{resource_type} threshold exceeded: {threshold.name}",
                        description=f"{resource_type} usage {current_value:.1f}% exceeds threshold {threshold.threshold_value}% on {agent.hostname}",
                        level=alert_level,
                        alert_type='resource',
                        metadata={
                            'resource_type': resource_type.lower(),
                            'current_value': current_value,
                            'threshold_value': threshold.threshold_value,
                            'threshold_name': threshold.name
                        },
                        timestamp=metric.timestamp
                    )
                        
            except Exception as e:
                logger.error(f"Error checking threshold {threshold.name}: {str(e)}")

class AlertViewSet(viewsets.ModelViewSet):
    queryset = Alert.objects.all().order_by('-triggered_at')
    serializer_class = AlertSerializer
    # Remove pagination_class = None to enable default pagination
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by resolved status
        resolved_param = self.request.query_params.get('resolved')
        if resolved_param == 'true':
            queryset = queryset.filter(resolved=True)
        elif resolved_param == 'false':
            queryset = queryset.filter(resolved=False)
        
        # Filter by level
        level = self.request.query_params.get('level')
        if level:
            queryset = queryset.filter(level=level)
        
        # Filter by agent
        agent_id = self.request.query_params.get('agent')
        if agent_id:
            queryset = queryset.filter(agent_id=agent_id)
        
        # Filter by alert_type (new filter)
        alert_type = self.request.query_params.get('alert_type')
        if alert_type:
            queryset = queryset.filter(alert_type=alert_type)
        
        return queryset
    
    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """Mark alert as resolved"""
        alert = self.get_object()
        alert.resolved = True
        alert.resolved_at = timezone.now()
        alert.save()
        
        # Send resolution notification
        threading.Thread(target=self._send_resolution_notification, args=(alert,)).start()
        
        return Response({'status': 'alert resolved'})
    
    @action(detail=True, methods=['post'])
    def unresolve(self, request, pk=None):
        """Mark alert as unresolved"""
        alert = self.get_object()
        alert.resolved = False
        alert.resolved_at = None
        alert.save()
        
        serializer = self.get_serializer(alert)
        return Response({
            'status': 'alert unresolved',
            'alert': serializer.data
        })
    
    @action(detail=True, methods=['post'])
    def add_note(self, request, pk=None):
        """Add note to alert"""
        alert = self.get_object()
        note = request.data.get('note', '').strip()
        
        if not note:
            return Response(
                {'error': 'Note cannot be empty'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        alert.add_note(note)
        alert.save()
        
        serializer = self.get_serializer(alert)
        return Response({
            'status': 'note added',
            'alert': serializer.data
        })
    
    @action(detail=False, methods=['post'])
    def bulk_resolve(self, request):
        """Bulk resolve alerts"""
        try:
            alert_ids = request.data.get('alert_ids', [])
            if not alert_ids:
                return Response(
                    {'error': 'No alert IDs provided'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate alert IDs are integers
            try:
                alert_ids = [int(alert_id) for alert_id in alert_ids]
            except (ValueError, TypeError):
                return Response(
                    {'error': 'Invalid alert IDs'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            alerts = Alert.objects.filter(id__in=alert_ids)
            updated_count = alerts.update(
                resolved=True,
                resolved_at=timezone.now()
            )
            
            logger.info(f"Bulk resolved {updated_count} alerts")
            
            return Response({
                'status': 'success',
                'message': f'Successfully resolved {updated_count} alert(s)',
                'resolved_count': updated_count
            })
            
        except Exception as e:
            logger.error(f"Bulk resolve error: {str(e)}")
            return Response(
                {'error': f'Bulk resolve failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def bulk_unresolve(self, request):
        """Bulk unresolve alerts"""
        try:
            alert_ids = request.data.get('alert_ids', [])
            if not alert_ids:
                return Response(
                    {'error': 'No alert IDs provided'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate alert IDs are integers
            try:
                alert_ids = [int(alert_id) for alert_id in alert_ids]
            except (ValueError, TypeError):
                return Response(
                    {'error': 'Invalid alert IDs'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            alerts = Alert.objects.filter(id__in=alert_ids)
            updated_count = alerts.update(
                resolved=False,
                resolved_at=None
            )
            
            logger.info(f"Bulk unresolved {updated_count} alerts")
            
            return Response({
                'status': 'success',
                'message': f'Successfully unresolved {updated_count} alert(s)',
                'unresolved_count': updated_count
            })
            
        except Exception as e:
            logger.error(f"Bulk unresolve error: {str(e)}")
            return Response(
                {'error': f'Bulk unresolve failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def bulk_delete(self, request):
        """Bulk delete alerts"""
        try:
            alert_ids = request.data.get('alert_ids', [])
            if not alert_ids:
                return Response(
                    {'error': 'No alert IDs provided'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate alert IDs are integers
            try:
                alert_ids = [int(alert_id) for alert_id in alert_ids]
            except (ValueError, TypeError):
                return Response(
                    {'error': 'Invalid alert IDs'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            alerts = Alert.objects.filter(id__in=alert_ids)
            deleted_count = alerts.count()
            
            # Delete alerts
            alerts.delete()
            
            logger.info(f"Bulk deleted {deleted_count} alerts")
            
            return Response({
                'status': 'success',
                'message': f'Successfully deleted {deleted_count} alert(s)',
                'deleted_count': deleted_count
            })
            
        except Exception as e:
            logger.error(f"Bulk delete error: {str(e)}")
            return Response(
                {'error': f'Bulk delete failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _send_resolution_notification(self, alert):
        """Send resolution notifications"""
        channels = NotificationChannel.objects.filter(is_active=True)
        
        for channel in channels:
            try:
                if channel.channel_type == 'email':
                    self._send_email_resolution(channel, alert)
                elif channel.channel_type == 'discord':
                    self._send_discord_resolution(channel, alert)
            except Exception as e:
                logger.error(f"Resolution notification failed for {channel.name}: {str(e)}")
    
    def _send_email_resolution(self, channel, alert):
        """Send email resolution notification"""
        logger.info(f"Would send email resolution for alert: {alert.title}")

    def _send_discord_resolution(self, channel, alert):
        """Send Discord resolution notification"""
        logger.info(f"Would send Discord resolution for alert: {alert.title}")

class UserSessionViewSet(viewsets.ModelViewSet):
    queryset = UserSession.objects.all().order_by('-login_time')
    serializer_class = UserSessionSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by agent
        agent_id = self.request.query_params.get('agent_id')
        if agent_id and agent_id != 'null':
            try:
                queryset = queryset.filter(agent_id=int(agent_id))
            except (ValueError, TypeError):
                pass
        
        # Filter by time range
        hours = self.request.query_params.get('hours', 24)
        try:
            time_threshold = timezone.now() - timedelta(hours=int(hours))
            queryset = queryset.filter(login_time__gte=time_threshold)
        except (ValueError, TypeError):
            pass
        
        return queryset

class HostMetricViewSet(viewsets.ModelViewSet):
    queryset = HostMetric.objects.all().order_by('-timestamp')
    serializer_class = HostMetricSerializer
    pagination_class = None
    
    def get_permissions(self):
        """Allow agents to upload metrics without frontend authentication"""
        if self.action == 'upload_metrics':
            return [AllowAny()]
        return [IsAuthenticated()]
    
    # In your HostMetricViewSet, enhance the get_queryset method:
    def get_queryset(self):
        queryset = super().get_queryset()

        # Log all query parameters
        logger.info(f"🔍 METRICS API CALL - All query params: {dict(self.request.query_params)}")

        # Filter by agent
        agent_id = self.request.query_params.get('agent_id')
        logger.info(f"🔍 Agent ID from request: '{agent_id}' (type: {type(agent_id)})")

        if agent_id and agent_id != 'null':
            try:
                agent_id_int = int(agent_id)
                initial_count = queryset.count()
                queryset = queryset.filter(agent_id=agent_id_int)
                filtered_count = queryset.count()
                logger.info(f"🔍 Agent filtering - Before: {initial_count}, After: {filtered_count}")
            except (ValueError, TypeError) as e:
                logger.error(f"🔍 Invalid agent ID: '{agent_id}', error: {e}")
                pass
            
        # Filter by time range
        hours = self.request.query_params.get('hours', 24)
        logger.info(f"🔍 Hours parameter: '{hours}' (type: {type(hours)})")

        try:
            hours_int = int(hours)
            time_threshold = timezone.now() - timedelta(hours=hours_int)
            initial_count = queryset.count()
            queryset = queryset.filter(timestamp__gte=time_threshold)
            filtered_count = queryset.count()
            logger.info(f"🔍 Time filtering - Hours: {hours_int}, Before: {initial_count}, After: {filtered_count}")
            logger.info(f"🔍 Time threshold: {time_threshold}")
            logger.info(f"🔍 Current time: {timezone.now()}")
        except (ValueError, TypeError) as e:
            logger.error(f"🔍 Invalid hours parameter: '{hours}', error: {e}")

        final_count = queryset.count()
        logger.info(f"🔍 FINAL QUERYSET COUNT: {final_count}")

        # Log a few sample records
        if final_count > 0:
            samples = queryset[:3]
            logger.info(f"🔍 SAMPLE METRICS ({len(samples)}):")
            for i, sample in enumerate(samples):
                logger.info(f"🔍   {i+1}. ID: {sample.id}, Time: {sample.timestamp}, CPU: {sample.cpu_usage}%")
        else:
            logger.warning("🔍 NO METRICS FOUND AFTER FILTERING!")

            # Debug: check what happens without time filtering
            no_time_filter = HostMetric.objects.filter(agent_id=agent_id)
            logger.info(f"🔍 DEBUG - Without time filter: {no_time_filter.count()} metrics")

        return queryset
    
    @action(detail=False, methods=['post'])
    def upload_metrics(self, request):
        """Handle metric uploads from agents"""
        serializer = MetricUploadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            data = serializer.validated_data
            
            # Get agent
            try:
                agent = MonitoringAgent.objects.get(hostname=data['hostname'])
            except MonitoringAgent.DoesNotExist:
                return Response({'error': 'Agent not found'}, status=status.HTTP_404_NOT_FOUND)
            
            # Save metric
            metric = HostMetric.objects.create(
                agent=agent,
                timestamp=data['timestamp'],
                cpu_usage=data['cpu_usage'],
                memory_usage=data['memory_usage'],
                memory_total=data['memory_total'],
                memory_used=data['memory_used'],
                disk_usage=data['disk_usage'],
                disk_total=data['disk_total'],
                disk_used=data['disk_used'],
                network_sent=data['network_sent'],
                network_received=data['network_received']
            )
            
            # Check thresholds
            self._check_thresholds(agent, metric)
            
            return Response({
                'status': 'success',
                'metric_id': metric.id
            })
            
        except Exception as e:
            logger.error(f"Metric upload error: {str(e)}")
            return Response(
                {'error': 'Failed to process metrics'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _check_thresholds(self, agent, metric):
        """Check resource thresholds and generate alerts with cooldown"""
        thresholds = ResourceThreshold.objects.filter(is_active=True)
        
        for threshold in thresholds:
            try:
                should_alert = False
                current_value = 0
                resource_type = ''
                
                if (threshold.resource_type == 'cpu' and 
                    metric.cpu_usage > threshold.threshold_value):
                    should_alert = True
                    current_value = metric.cpu_usage
                    resource_type = 'CPU'
                
                elif (threshold.resource_type == 'memory' and 
                      metric.memory_usage > threshold.threshold_value):
                    should_alert = True
                    current_value = metric.memory_usage
                    resource_type = 'Memory'
                
                elif (threshold.resource_type == 'disk' and 
                      metric.disk_usage > threshold.threshold_value):
                    should_alert = True
                    current_value = metric.disk_usage
                    resource_type = 'Disk'
                
                if should_alert:
                    if self._should_create_alert(agent, threshold, resource_type):
                        self._create_threshold_alert(agent, threshold, current_value, resource_type)
                        
            except Exception as e:
                logger.error(f"Error checking threshold {threshold.name}: {str(e)}")
    
    def _should_create_alert(self, agent, threshold, resource_type):
        """Check if we should create a new alert (cooldown logic)"""
        recent_time = timezone.now() - timedelta(minutes=30)
        
        existing_alerts = Alert.objects.filter(
            agent=agent,
            title=f"{resource_type} threshold exceeded: {threshold.name}",
            resolved=False,
            triggered_at__gte=recent_time
        )
        
        return not existing_alerts.exists()
    
    def _create_threshold_alert(self, agent, threshold, current_value, resource_type):
        """Create alert and send notifications"""
        alert_level = 'critical' if current_value > 95 else 'high' if current_value > 85 else 'medium'
        
        alert = Alert.objects.create(
            agent=agent,
            title=f"{resource_type} threshold exceeded: {threshold.name}",
            description=f"{resource_type} usage {current_value:.1f}% exceeds threshold {threshold.threshold_value}% on {agent.hostname}",
            level=alert_level,
            resolved=False
        )
        
        logger.info(f"Created alert: {alert.title} (Level: {alert.level})")

class ProcessViewSet(viewsets.ViewSet):
    def get_permissions(self):
        """Allow agents to upload processes without frontend authentication"""
        if self.action == 'upload_processes':
            return [AllowAny()]
        return [IsAuthenticated()]
    
    @action(detail=False, methods=['post'])
    def upload_processes(self, request):
        """Handle process list upload from agents"""
        try:
            data = request.data
            hostname = data.get('hostname')
            
            if not hostname:
                return Response({'error': 'hostname is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Get agent
            try:
                agent = MonitoringAgent.objects.get(hostname=hostname)
            except MonitoringAgent.DoesNotExist:
                return Response({'error': 'Agent not found'}, status=status.HTTP_404_NOT_FOUND)
            
            # Get process data - support both field names for backward compatibility
            process_data = data.get('process_system_activity') or data.get('processes')
            
            if not process_data:
                return Response({
                    'error': 'process_system_activity field is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Save process snapshot
            snapshot = ProcessSnapshot.objects.create(
                agent=agent,
                processes=process_data
            )
            
            return Response({
                'status': 'success',
                'snapshot_id': snapshot.id
            })
            
        except Exception as e:
            logger.error(f"Process upload error: {str(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return Response(
                {'error': 'Failed to process process list', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def get_processes(self, request):
        """Get current processes for an agent"""
        hostname = request.query_params.get('hostname')
        agent_id = request.query_params.get('agent_id')
        
        if not hostname and not agent_id:
            return Response({'error': 'hostname or agent_id parameter required'}, status=400)
        
        try:
            if agent_id:
                agent = MonitoringAgent.objects.get(id=agent_id)
            else:
                agent = MonitoringAgent.objects.get(hostname=hostname)
            
            latest_snapshot = ProcessSnapshot.objects.filter(agent=agent).order_by('-timestamp').first()
            
            if not latest_snapshot:
                return Response({
                    'hostname': agent.hostname,
                    'timestamp': timezone.now().isoformat(),
                    'total_processes': 0,
                    'root_processes': 0,
                    'page': 1,
                    'page_size': 50,
                    'total_pages': 0,
                    'top_cpu_processes': [],
                    'top_memory_processes': [],
                    'load_average': []
                })
            
            processes_data = latest_snapshot.processes
            
            # Extract process information
            total_processes = processes_data.get('total_processes', 0)
            root_processes = processes_data.get('root_processes', 0)
            top_cpu = processes_data.get('top_cpu_processes', [])
            top_memory = processes_data.get('top_memory_processes', [])
            load_avg = processes_data.get('load_average', [])
            
            # Pagination for top memory processes
            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('page_size', 50))
            
            start_idx = (page - 1) * page_size
            end_idx = start_idx + page_size
            paginated_memory = top_memory[start_idx:end_idx]
            
            return Response({
                'hostname': agent.hostname,
                'timestamp': latest_snapshot.timestamp,
                'total_processes': total_processes,
                'root_processes': root_processes,
                'page': page,
                'page_size': page_size,
                'total_pages': (len(top_memory) + page_size - 1) // page_size if top_memory else 0,
                'top_cpu_processes': top_cpu,
                'top_memory_processes': paginated_memory,
                'load_average': load_avg
            })
                
        except MonitoringAgent.DoesNotExist:
            return Response({'error': 'Agent not found'}, status=404)
        except Exception as e:
            logger.error(f"Error getting processes: {str(e)}")
            return Response({'error': str(e)}, status=500)

class ResourceThresholdViewSet(viewsets.ModelViewSet):
    queryset = ResourceThreshold.objects.all()
    serializer_class = ResourceThresholdSerializer
    permission_classes = [IsAuthenticated]

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        print(">>> Thresholds returned by GET:", serializer.data)  # 👈 Log data to console
        return Response(serializer.data)


class NotificationChannelViewSet(viewsets.ModelViewSet):
    queryset = NotificationChannel.objects.all()
    serializer_class = NotificationChannelSerializer
    permission_classes = [IsAuthenticated]