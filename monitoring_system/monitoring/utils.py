"""
Utility functions for monitoring system
"""
import base64
import json
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC


class DecryptionManager:
    """Handles decryption of data from monitoring agents"""
    
    def __init__(self):
        self.fernet = None
    
    def generate_key_from_password(self, password, salt):
        """Generate encryption key from password and salt"""
        if isinstance(salt, str):
            salt = base64.urlsafe_b64decode(salt.encode())
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(password.encode()))
        return key
    
    def initialize_from_password(self, password, salt):
        """Initialize decryption with password and salt"""
        key = self.generate_key_from_password(password, salt)
        self.fernet = Fernet(key)
    
    def decrypt_data(self, encrypted_data):
        """Decrypt data received from agent"""
        if not self.fernet:
            raise ValueError("Decryption not initialized")
        
        try:
            # Decode the base64 encoded encrypted data
            encrypted_bytes = base64.urlsafe_b64decode(encrypted_data.encode())
            # Decrypt
            decrypted_data = self.fernet.decrypt(encrypted_bytes)
            # Parse JSON
            return json.loads(decrypted_data.decode())
        except Exception as e:
            raise ValueError(f"Decryption failed: {str(e)}")


class AlertGenerator:
    """Generates alerts based on monitoring data"""
    
    @staticmethod
    def generate_alerts(agent, log_entry):
        """Generate alerts from log entry data"""
        alerts = []
        
        try:
            # Check for high CPU usage
            resource_data = log_entry.get('resource_anomalies', {})
            cpu_percent = resource_data.get('cpu_percent', 0)
            if cpu_percent > 90:
                alerts.append({
                    'title': 'High CPU Usage',
                    'description': f'CPU usage is at {cpu_percent}%',
                    'level': 'high'
                })
            
            # Check for high memory usage
            memory_percent = resource_data.get('memory_percent', 0)
            if memory_percent > 90:
                alerts.append({
                    'title': 'High Memory Usage',
                    'description': f'Memory usage is at {memory_percent}%',
                    'level': 'high'
                })
            
            # Check for high disk usage
            disk_percent = resource_data.get('disk_percent', 0)
            if disk_percent > 90:
                alerts.append({
                    'title': 'High Disk Usage',
                    'description': f'Disk usage is at {disk_percent}%',
                    'level': 'critical'
                })
            
            # Check for failed login attempts
            auth_data = log_entry.get('authentication', {})
            failed_logins = auth_data.get('failed_login_attempts', 0)
            if failed_logins > 10:
                alerts.append({
                    'title': 'Multiple Failed Login Attempts',
                    'description': f'{failed_logins} failed login attempts detected',
                    'level': 'high'
                })
            
            # Check for suspicious processes
            anomaly_data = log_entry.get('anomaly_threat_detection', {})
            suspicious_processes = anomaly_data.get('suspicious_processes', 0)
            if suspicious_processes > 0:
                alerts.append({
                    'title': 'Suspicious Processes Detected',
                    'description': f'{suspicious_processes} suspicious processes found',
                    'level': 'critical'
                })
            
            # Check for unusual connections
            unusual_connections = anomaly_data.get('unusual_connections', 0)
            if unusual_connections > 0:
                alerts.append({
                    'title': 'Unusual Network Connections',
                    'description': f'{unusual_connections} connections to unusual ports detected',
                    'level': 'high'
                })
            
            # Check for zombie processes
            zombie_processes = resource_data.get('zombie_processes', 0)
            if zombie_processes > 5:
                alerts.append({
                    'title': 'Multiple Zombie Processes',
                    'description': f'{zombie_processes} zombie processes detected',
                    'level': 'medium'
                })
            
            # Check for agent errors
            agent_errors = log_entry.get('agent_errors', {})
            if agent_errors.get('high_error_rate', False):
                alerts.append({
                    'title': 'Agent Error Rate High',
                    'description': 'Monitoring agent experiencing high error rate',
                    'level': 'medium'
                })
            
        except Exception as e:
            # Don't let alert generation failures crash the whole process
            print(f"Error generating alerts: {e}")
        
        return alerts