import json
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class DecryptionManager:
    def __init__(self):
        self.fernet = None
    
    def initialize_from_password(self, password, salt):
        """Initialize Fernet instance from password and salt"""
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=base64.urlsafe_b64decode(salt.encode()),
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(password.encode()))
        self.fernet = Fernet(key)
    
    def decrypt_data(self, encrypted_data):
        """Decrypt data received from agent"""
        if not self.fernet:
            raise ValueError("Decryption not initialized")
        
        encrypted_bytes = base64.urlsafe_b64decode(encrypted_data.encode())
        decrypted_data = self.fernet.decrypt(encrypted_bytes)
        return json.loads(decrypted_data.decode())

class AlertGenerator:
    @staticmethod
    def generate_alerts(agent, log_data):
        """Generate alerts based on log data"""
        alerts = []
        
        # Check for high CPU usage
        if log_data.get('resource_anomalies', {}).get('cpu_percent', 0) > 90:
            alerts.append({
                'title': 'High CPU Usage',
                'description': f"CPU usage is {log_data['resource_anomalies']['cpu_percent']}%",
                'level': 'high'
            })
        
        # Check for high memory usage
        if log_data.get('resource_anomalies', {}).get('memory_percent', 0) > 90:
            alerts.append({
                'title': 'High Memory Usage',
                'description': f"Memory usage is {log_data['resource_anomalies']['memory_percent']}%",
                'level': 'high'
            })
        
        # Check for failed login attempts
        failed_logins = log_data.get('authentication', {}).get('failed_login_attempts', 0)
        if failed_logins > 10:
            alerts.append({
                'title': 'Multiple Failed Login Attempts',
                'description': f"{failed_logins} failed login attempts detected",
                'level': 'medium'
            })
        
        # Check for suspicious processes
        suspicious_procs = log_data.get('anomaly_threat_detection', {}).get('suspicious_processes', 0)
        if suspicious_procs > 0:
            alerts.append({
                'title': 'Suspicious Processes Detected',
                'description': f"{suspicious_procs} suspicious processes found",
                'level': 'critical'
            })
        
        # Check for agent errors
        agent_errors = log_data.get('agent_errors', {})
        if agent_errors.get('high_error_rate', False):
            alerts.append({
                'title': 'Agent High Error Rate',
                'description': 'Monitoring agent is experiencing high error rate',
                'level': 'high'
            })
        
        return alerts