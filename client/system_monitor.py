#!/usr/bin/env python3
"""
Enhanced System Monitoring Agent with Encryption and Registration
Collects system information and sends encrypted data to central server periodically
"""

import os
import sys
import time
import json
import socket
import subprocess
import threading
import base64
import getpass
import shutil
from datetime import datetime
from collections import defaultdict
import logging
from pathlib import Path

# Try to import required modules, prompt for installation if missing
try:
    import psutil
    import requests
    DEPENDENCIES_INSTALLED = True
except ImportError:
    DEPENDENCIES_INSTALLED = False

# Try to import encryption modules
try:
    from cryptography.fernet import Fernet
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
    ENCRYPTION_AVAILABLE = True
except ImportError:
    ENCRYPTION_AVAILABLE = False

# Configuration
CONFIG = {
    'server_base_url': 'http://localhost:8000/api',
    'interval': 60,
    'hostname': socket.gethostname(),
    'max_retries': 3,
    'timeout': 10,
    'batch_size': 50,
    'install_dir': '/opt/system_monitor',
    'config_file': '/etc/system_monitor/config.json',
    'log_file': '/var/log/system_monitor/system_monitor.log',
    'venv_dir': '/opt/system_monitor/venv'
}

# Setup logging
def setup_logging():
    log_dir = os.path.dirname(CONFIG['log_file'])
    if not os.path.exists(log_dir):
        try:
            os.makedirs(log_dir, mode=0o755, exist_ok=True)
        except:
            CONFIG['log_file'] = 'system_monitor.log'
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(CONFIG['log_file']),
            logging.StreamHandler()
        ]
    )

class EncryptionManager:
    """Handles encryption for agent communications"""
    
    def __init__(self, password, salt='default_salt_12345'):
        if not ENCRYPTION_AVAILABLE:
            raise ImportError("Cryptography library not available")
        
        self.password = password
        self.salt = salt
        self.fernet = None
        self.initialize_encryption()
    
    def generate_key_from_password(self):
        """Generate encryption key from password and salt"""
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=self.salt.encode(),
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(self.password.encode()))
        return key
    
    def initialize_encryption(self):
        """Initialize encryption with password and salt"""
        key = self.generate_key_from_password()
        self.fernet = Fernet(key)
    
    def encrypt_data(self, data):
        """Encrypt data before sending to server"""
        if not self.fernet:
            raise ValueError("Encryption not initialized")
        
        # Convert data to JSON string first, then to bytes
        if isinstance(data, (dict, list)):
            data = json.dumps(data)
        
        if isinstance(data, str):
            data = data.encode('utf-8')
        
        encrypted_bytes = self.fernet.encrypt(data)
        return base64.urlsafe_b64encode(encrypted_bytes).decode('utf-8')

class Installer:
    """Handles installation of the monitoring agent"""
    
    @staticmethod
    def check_python():
        """Check if Python 3 is available"""
        if sys.version_info < (3, 6):
            print("❌ Python 3.6+ is required")
            return False
        print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor} detected")
        return True
    
    @staticmethod
    def check_root():
        """Check if running as root"""
        if os.geteuid() != 0:
            print("⚠️  WARNING: Not running as root/sudo")
            print("   Installation requires root privileges for:")
            print("   - Creating system directories")
            print("   - Installing systemd service")
            print("   - Full monitoring capabilities")
            response = input("\nContinue anyway? (y/N): ").lower()
            return response == 'y'
        return True
    
    @staticmethod
    def install_dependencies():
        """Install required Python packages"""
        print("\n--- Installing Dependencies ---")
        
        requirements = [
            'psutil>=5.8.0',
            'requests>=2.25.0',
            'cryptography>=3.4.0'
        ]
        
        try:
            # Check if we should use venv
            use_venv = os.path.exists(CONFIG['venv_dir']) or os.geteuid() == 0
            
            if use_venv and not os.path.exists(CONFIG['venv_dir']):
                print(f"Creating virtual environment at {CONFIG['venv_dir']}...")
                os.makedirs(os.path.dirname(CONFIG['venv_dir']), mode=0o755, exist_ok=True)
                subprocess.run([sys.executable, '-m', 'venv', CONFIG['venv_dir']], check=True)
                pip_executable = os.path.join(CONFIG['venv_dir'], 'bin', 'pip')
            elif use_venv:
                pip_executable = os.path.join(CONFIG['venv_dir'], 'bin', 'pip')
            else:
                pip_executable = 'pip3'
            
            print(f"Installing packages using {pip_executable}...")
            for req in requirements:
                print(f"  Installing {req}...")
                subprocess.run([pip_executable, 'install', '-q', req], check=True)
            
            print("✅ Dependencies installed successfully")
            return True
            
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to install dependencies: {e}")
            print("\nTry installing manually:")
            print(f"  pip3 install {' '.join(requirements)}")
            return False
        except Exception as e:
            print(f"❌ Error during installation: {e}")
            return False
    
    @staticmethod
    def create_directories():
        """Create necessary directories"""
        print("\n--- Creating Directories ---")
        
        directories = [
            (CONFIG['install_dir'], 0o755),
            (os.path.dirname(CONFIG['config_file']), 0o700),
            (os.path.dirname(CONFIG['log_file']), 0o755),
        ]
        
        for directory, mode in directories:
            try:
                os.makedirs(directory, mode=mode, exist_ok=True)
                print(f"✅ Created {directory}")
            except Exception as e:
                print(f"⚠️  Could not create {directory}: {e}")
    
    @staticmethod
    def copy_script():
        """Copy this script to installation directory"""
        print("\n--- Installing Script ---")
        
        try:
            script_path = os.path.abspath(__file__)
            target_path = os.path.join(CONFIG['install_dir'], 'system_monitor.py')
            
            if script_path != target_path:
                shutil.copy2(script_path, target_path)
                os.chmod(target_path, 0o755)
                print(f"✅ Script installed to {target_path}")
            else:
                print(f"✅ Script already in installation directory")
            
            return target_path
        except Exception as e:
            print(f"⚠️  Could not copy script: {e}")
            return script_path
    
    @staticmethod
    def create_systemd_service():
        """Create systemd service file"""
        print("\n--- Creating Systemd Service ---")
        
        if os.geteuid() != 0:
            print("⚠️  Skipping systemd service (requires root)")
            return False
        
        # Determine Python executable path
        if os.path.exists(CONFIG['venv_dir']):
            python_exec = os.path.join(CONFIG['venv_dir'], 'bin', 'python')
        else:
            python_exec = sys.executable
        
        script_path = os.path.join(CONFIG['install_dir'], 'system_monitor.py')
        
        service_content = f"""[Unit]
Description=Enhanced System Monitoring Agent
After=network.target
Wants=network.target

[Service]
Type=simple
User=root
ExecStart={python_exec} {script_path}
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

# Security settings
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths={os.path.dirname(CONFIG['log_file'])} {os.path.dirname(CONFIG['config_file'])}

[Install]
WantedBy=multi-user.target
"""
        
        try:
            service_path = '/etc/systemd/system/system-monitor.service'
            with open(service_path, 'w') as f:
                f.write(service_content)
            os.chmod(service_path, 0o600)
            
            # Reload systemd
            subprocess.run(['systemctl', 'daemon-reload'], check=True)
            
            print(f"✅ Systemd service created at {service_path}")
            return True
        except Exception as e:
            print(f"⚠️  Could not create systemd service: {e}")
            return False
    
    @staticmethod
    def install():
        """Run complete installation"""
        print("=" * 60)
        print("  ENHANCED SYSTEM MONITORING AGENT - INSTALLER")
        print("=" * 60)
        
        # Check prerequisites
        if not Installer.check_python():
            return False
        
        if not Installer.check_root():
            return False
        
        # Create directories
        Installer.create_directories()
        
        # Install dependencies
        if not DEPENDENCIES_INSTALLED:
            if not Installer.install_dependencies():
                print("\n❌ Installation failed. Please install dependencies manually.")
                return False
        else:
            print("\n✅ Dependencies already installed")
        
        # Copy script
        script_path = Installer.copy_script()
        
        # Create systemd service
        systemd_created = Installer.create_systemd_service()
        
        # Print completion message
        print("\n" + "=" * 60)
        print("  INSTALLATION COMPLETE")
        print("=" * 60)
        
        if os.path.exists(CONFIG['venv_dir']):
            python_cmd = f"{CONFIG['venv_dir']}/bin/python {script_path}"
        else:
            python_cmd = f"python3 {script_path}"
        
        print("\nNext steps:")
        print(f"1. Run setup: sudo {python_cmd} setup")
        
        if systemd_created:
            print("2. Start service: sudo systemctl start system-monitor")
            print("3. Enable auto-start: sudo systemctl enable system-monitor")
            print("4. Check logs: journalctl -u system-monitor -f")
        else:
            print(f"2. Run manually: sudo {python_cmd}")
        
        print(f"\nConfiguration will be stored in: {CONFIG['config_file']}")
        print(f"Logs will be written to: {CONFIG['log_file']}")
        
        return True


class ConfigManager:
    def __init__(self, config_file):
        self.config_file = config_file
        self.config = {}
    
    def setup_config(self):
        """Interactive configuration setup with registration"""
        print("\n=== System Monitor Setup ===")
        
        # Check if running as root
        if os.geteuid() != 0:
            print("⚠️  WARNING: Not running as root. Some monitoring features may not work properly.")
            print("   Recommended to run setup as administrator/sudo user.")
            response = input("Continue anyway? (y/N): ").lower()
            if response != 'y':
                print("Setup cancelled.")
                sys.exit(1)
        
        # Server configuration
        print("\n--- Server Configuration ---")
        server_base_url = input("Enter central server base URL (e.g., http://localhost:8000/api): ").strip()
        if not server_base_url:
            server_base_url = 'http://localhost:8000/api'
            print(f"Using default URL: {server_base_url}")
        
        # Remove trailing slash if present
        server_base_url = server_base_url.rstrip('/')
        
        # Encryption setup
        print("\n--- Encryption Setup ---")
        encryption_password = getpass.getpass("Enter encryption password: ").strip()
        if not encryption_password:
            print("❌ Encryption password is required!")
            sys.exit(1)
        
        confirm_password = getpass.getpass("Confirm encryption password: ").strip()
        if encryption_password != confirm_password:
            print("❌ Passwords do not match!")
            sys.exit(1)
        
        # Get system information for registration
        hostname = socket.gethostname()
        username = getpass.getuser()
        
        try:
            # Get IP address
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip_address = s.getsockname()[0]
            s.close()
        except:
            ip_address = "127.0.0.1"
        
        # Registration
        print("\n--- Agent Registration ---")
        print(f"Hostname: {hostname}")
        print(f"Username: {username}")
        print(f"IP Address: {ip_address}")
        print("\nThe agent will need to be approved in the web interface before it can send logs.")
        
        register_now = input("Register with central server now? (Y/n): ").strip().lower()
        if register_now != 'n':
            self.register_agent(server_base_url, hostname, username, ip_address, encryption_password)
        
        # User monitoring scope
        print("\n--- User Monitoring Scope ---")
        print("1. Monitor all users")
        print("2. Monitor specific user only")
        choice = input("Choose option (1 or 2): ").strip()
        
        monitor_all_users = True
        specific_user = None
        
        if choice == "2":
            monitor_all_users = False
            specific_user = input("Enter username to monitor: ").strip()
            if not specific_user:
                print("Specific username is required!")
                sys.exit(1)
        
        # Monitoring interval
        interval = input("Enter monitoring interval in seconds (default: 60): ").strip()
        try:
            interval = int(interval) if interval else 60
        except ValueError:
            interval = 60
            print("Using default interval: 60 seconds")
        
        # Save configuration
        self.config = {
            'server_base_url': server_base_url,
            'hostname': hostname,
            'username': username,
            'encryption_password': encryption_password,
            'encryption_salt': 'default_salt_12345',
            'monitor_all_users': monitor_all_users,
            'specific_user': specific_user,
            'interval': interval,
            'max_retries': CONFIG['max_retries'],
            'timeout': CONFIG['timeout'],
            'batch_size': CONFIG['batch_size'],
            'setup_time': datetime.utcnow().isoformat()
        }
        
        self.save_config()
        print(f"\n✅ Configuration saved to {self.config_file}")
        
        return self.config
    
    def register_agent(self, server_base_url, hostname, username, ip_address, encryption_password):
        """Register agent with central server"""
        print("\n--- Registering Agent ---")
        
        try:
            registration_url = f"{server_base_url}/registrations/"
            
            registration_data = {
                'hostname': hostname,
                'username': username,
                'ip_address': ip_address,
                'encryption_password': encryption_password,
                'monitoring_scope': 'all_users'
            }
            
            response = requests.post(registration_url, json=registration_data, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                print("✅ Registration request submitted successfully!")
                print(f"   Status: {result.get('status', 'unknown')}")
                print(f"   Message: {result.get('message', 'No message')}")
                if 'request_id' in result:
                    print(f"   Request ID: {result['request_id']}")
            elif response.status_code == 400:
                error_data = response.json()
                print(f"⚠️  Registration warning: {error_data.get('error', 'Unknown error')}")
            else:
                print(f"❌ Registration failed with status {response.status_code}")
                print(f"   Response: {response.text}")
                
        except requests.exceptions.RequestException as e:
            print(f"⚠️  Could not connect to server: {e}")
            print("   You will need to register manually through the web interface.")
        except Exception as e:
            print(f"⚠️  Registration error: {e}")
            print("   You will need to register manually through the web interface.")
    
    def load_config(self):
        """Load existing configuration"""
        try:
            with open(self.config_file, 'r') as f:
                self.config = json.load(f)
            return self.config
        except Exception as e:
            logging.error(f"Error loading config: {e}")
            return None
    
    def save_config(self):
        """Save configuration to file"""
        os.makedirs(os.path.dirname(self.config_file), mode=0o700, exist_ok=True)
        with open(self.config_file, 'w') as f:
            json.dump(self.config, f, indent=2)
        os.chmod(self.config_file, 0o600)


class SystemMonitor:
    def __init__(self, config_manager):
        self.config_manager = config_manager
        self.config = config_manager.config
        self.data_buffer = []
        self.last_send = 0
        self.running = False
        self.error_count = 0
        self.max_errors = 10
        
        # Initialize encryption
        try:
            self.encryption_mgr = EncryptionManager(
                password=self.config.get('encryption_password', ''),
                salt=self.config.get('encryption_salt', 'default_salt_12345')
            )
            logging.info("Encryption initialized successfully")
        except ImportError:
            logging.error("Cryptography library not available. Encryption disabled.")
            self.encryption_mgr = None
        except Exception as e:
            logging.error(f"Failed to initialize encryption: {e}")
            self.encryption_mgr = None
        
        # Agent status
        self.agent_active = True
        self.last_status_check = 0
        self.status_check_interval = 600  # Check every 10 minutes
        
        # Endpoint URLs
        self.logs_url = f"{self.config['server_base_url']}/logs/upload_logs/"
        self.metrics_url = f"{self.config['server_base_url']}/metrics/upload_metrics/"
        self.processes_url = f"{self.config['server_base_url']}/processes/upload_processes/"
        self.config_url = f"{self.config['server_base_url']}/agents/config_by_hostname/"

    def check_agent_status(self):
        """Check if agent is active and approved on server"""
        current_time = time.time()
        
        # Only check periodically to avoid too many requests
        if current_time - self.last_status_check < self.status_check_interval:
            return self.agent_active
        
        try:
            response = requests.get(
                self.config_url,
                params={'hostname': self.config['hostname']},
                timeout=5
            )
            
            if response.status_code == 200:
                config_data = response.json()
                is_active = config_data.get('is_active', False)
                is_approved = config_data.get('is_approved', False)
                
                self.agent_active = is_active and is_approved
                self.last_status_check = current_time
                
                if not self.agent_active:
                    logging.info(f"Agent status: Active={is_active}, Approved={is_approved}")
                
                return self.agent_active
            elif response.status_code == 404:
                logging.warning("Agent not found on server. Registration may be pending.")
                self.agent_active = False
                return False
            else:
                # If we can't check status, assume we can continue
                logging.warning(f"Status check failed with status {response.status_code}")
                return True
                
        except Exception as e:
            logging.warning(f"Could not check agent status: {e}")
            # If we can't check status, assume we can continue
            return True
    
    def collect_metrics_data(self):
        """Collect host metrics data for the metrics API"""
        try:
            # CPU usage
            cpu_percent = psutil.cpu_percent(interval=1)

            # Memory usage
            memory = psutil.virtual_memory()
            memory_percent = memory.percent
            memory_total = memory.total
            memory_used = memory.used

            # Disk usage
            disk = psutil.disk_usage('/')
            disk_percent = disk.percent
            disk_total = disk.total
            disk_used = disk.used

            # Network usage
            net_io = psutil.net_io_counters()
            network_sent = net_io.bytes_sent if net_io else 0
            network_received = net_io.bytes_recv if net_io else 0

            metrics_data = {
                'hostname': self.config['hostname'],
                'timestamp': datetime.utcnow().isoformat(),
                'cpu_usage': cpu_percent,
                'memory_usage': memory_percent,
                'memory_total': memory_total,
                'memory_used': memory_used,
                'disk_usage': disk_percent,
                'disk_total': disk_total,
                'disk_used': disk_used,
                'network_sent': network_sent,
                'network_received': network_received
            }

            return metrics_data

        except Exception as e:
            logging.error(f"Error collecting metrics: {e}")
            return None

    def send_metrics_to_server(self, metrics_data):
        """Send metrics data to the metrics API endpoint"""
        if not metrics_data:
            return False

        try:
            response = requests.post(
                self.metrics_url,
                json=metrics_data,
                timeout=self.config['timeout']
            )

            if response.status_code == 200:
                logging.info("Metrics sent successfully")
                return True
            else:
                logging.error(f"Failed to send metrics: {response.status_code} - {response.text}")
                return False

        except Exception as e:
            logging.error(f"Error sending metrics: {e}")
            return False

    def collect_process_data_detailed(self):
        """Collect detailed process data for the process API — returns all running processes."""
        try:
            processes = []
            for proc in psutil.process_iter([
                'pid', 'name', 'username', 'cpu_percent',
                'memory_percent', 'cmdline', 'status'
            ]):
                try:
                    proc_info = proc.info

                    # Filter processes by user if config says so
                    if not self.config.get('monitor_all_users', True):
                        specific_user = self.config.get('specific_user')
                        if specific_user and proc_info.get('username') != specific_user:
                            continue

                    processes.append({
                        'pid': proc_info.get('pid'),
                        'name': proc_info.get('name', 'unknown'),
                        'user': proc_info.get('username', 'unknown'),
                        'cpu_percent': proc_info.get('cpu_percent') or 0.0,
                        'memory_percent': proc_info.get('memory_percent') or 0.0,
                        'cmdline': proc_info.get('cmdline') or [],
                        'status': proc_info.get('status', 'unknown'),
                        'is_root': proc_info.get('username') == 'root'
                    })

                except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                    # Skip processes that disappeared or are restricted
                    continue

            # Sort CPU and memory separately for quick reference
            top_cpu = sorted(processes, key=lambda x: x['cpu_percent'], reverse=True)[:10]
            top_memory = sorted(processes, key=lambda x: x['memory_percent'], reverse=True)[:10]

            # Build structured payload
            process_data = {
                'hostname': self.config.get('hostname', os.uname().nodename),
                'timestamp': datetime.utcnow().isoformat(),
                'process_system_activity': {
                    'total_processes': len(processes),
                    'root_processes': sum(1 for p in processes if p['is_root']),
                    'top_cpu_processes': top_cpu,
                    'top_memory_processes': top_memory,
                    'load_average': list(os.getloadavg()) if hasattr(os, 'getloadavg') else [0, 0, 0],
                    'all_processes': processes  # full list for the frontend or API
                }
            }

            return process_data

        except Exception as e:
            logging.exception(f"Error collecting process data: {e}")
            return None


    def send_processes_to_server(self, process_data):
        """Send process data to the processes API endpoint"""
        if not process_data:
            return False

        try:
            response = requests.post(
                self.processes_url,
                json=process_data,
                timeout=self.config['timeout']
            )

            if response.status_code == 200:
                logging.info("Processes sent successfully")
                return True
            else:
                logging.error(f"Failed to send processes: {response.status_code} - {response.text}")
                return False

        except Exception as e:
            logging.error(f"Error sending processes: {e}")
            return False
    
    def collect_all_data(self):
        """Collect all system monitoring data for logs"""
        try:
            data = {
                'timestamp': datetime.utcnow().isoformat(),
                'hostname': self.config['hostname'],
                'users_logged_in': self.collect_logged_in_users(),
                'authentication': self.collect_authentication_data(),
                'process_system_activity': self.collect_process_summary(),
                'network_connection': self.collect_network_data(),
                'file_directory_integrity': self.collect_file_integrity_data(),
                'package_software_integrity': self.collect_package_data(),
                'system_logs_audit': self.collect_system_logs(),
                'security_tools': self.collect_security_data(),
                'resource_anomalies': self.collect_resource_data(),
                'hardware_peripheral_security': self.collect_hardware_data(),
                'environment_configuration': self.collect_environment_data(),
                'anomaly_threat_detection': self.collect_anomaly_data(),
                'other': self.collect_other_data(),
                'agent_errors': self.get_agent_errors()
            }
            return data
        except Exception as e:
            error_msg = f"Error collecting data: {str(e)}"
            logging.error(error_msg)
            self.record_error(error_msg)
            return {'timestamp': datetime.utcnow().isoformat(), 'collection_error': error_msg}
    
    def collect_process_summary(self):
        """Collect summary process data for logs (not detailed list)"""
        try:
            processes = []
            for proc in psutil.process_iter(['pid', 'name', 'username', 'cpu_percent', 'memory_percent', 'cmdline']):
                try:
                    proc_info = proc.info
                    
                    # Filter by user if specific user monitoring
                    if not self.config['monitor_all_users']:
                        specific_user = self.config.get('specific_user')
                        if proc_info['username'] != specific_user:
                            continue
                    
                    processes.append({
                        'pid': proc_info['pid'],
                        'name': proc_info['name'],
                        'user': proc_info['username'],
                        'cpu_percent': proc_info['cpu_percent'] or 0.0,
                        'memory_percent': proc_info['memory_percent'] or 0.0,
                        'cmdline': proc_info['cmdline'] or [],
                        'is_root': proc_info['username'] == 'root'
                    })
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
            
            # Get top CPU and memory processes (top 5 for logs)
            top_cpu = sorted([p for p in processes if p['cpu_percent'] > 0], 
                           key=lambda x: x['cpu_percent'], reverse=True)[:5]
            top_memory = sorted([p for p in processes if p['memory_percent'] > 0], 
                              key=lambda x: x['memory_percent'], reverse=True)[:5]
            
            return {
                'total_processes': len(processes),
                'root_processes': len([p for p in processes if p['is_root']]),
                'top_cpu_processes': top_cpu,
                'top_memory_processes': top_memory,
                'load_average': list(os.getloadavg()) if hasattr(os, 'getloadavg') else [0, 0, 0]
            }
        except Exception as e:
            error_msg = f"Error collecting process summary: {str(e)}"
            self.record_error(error_msg)
            return {'error': error_msg}
    
    def collect_logged_in_users(self):
        """Collect information about logged-in users"""
        try:
            users = []
            for user in psutil.users():
                user_info = {
                    'name': user.name,
                    'terminal': user.terminal,
                    'host': self.clean_host_address(user.host),
                    'started': user.started,
                    'pid': user.pid
                }
                
                # Check if we should monitor this user based on configuration
                if self.config['monitor_all_users'] or user.name == self.config.get('specific_user'):
                    users.append(user_info)
            
            return {
                'total_users': len(users),
                'users': users,
                'monitoring_scope': 'all_users' if self.config['monitor_all_users'] else f"specific_user:{self.config.get('specific_user')}"
            }
        except Exception as e:
            error_msg = f"Error collecting user data: {str(e)}"
            self.record_error(error_msg)
            return {'error': error_msg}
    
    def clean_host_address(self, host):
        """Clean and validate host address for database storage"""
        if not host or host in ['', ':0.0.0.0']:
            return '0.0.0.0'
        
        # Handle IPv6 localhost
        if host in [':1', '::1']:
            return '127.0.0.1'
        
        # Remove any leading colons from IPv6 addresses
        if host.startswith(':'):
            host = host.lstrip(':')
        
        # Basic validation for IPv4 addresses
        if host.count('.') == 3:
            try:
                parts = host.split('.')
                if all(part.isdigit() and 0 <= int(part) <= 255 for part in parts):
                    return host
            except:
                pass
        
        # If we can't validate it properly, use default
        return '0.0.0.0'
    
    def collect_authentication_data(self):
        """Collect authentication-related data"""
        try:
            auth_data = {
                'failed_login_attempts': self.get_failed_logins(),
                'successful_logins': self.get_successful_logins(),
                'user_changes': self.get_user_changes(),
                'privilege_escalation': self.get_sudo_events(),
                'ssh_key_changes': self.get_ssh_key_changes(),
                'account_lockouts': self.get_account_lockouts()
            }
            return auth_data
        except Exception as e:
            error_msg = f"Error collecting auth data: {str(e)}"
            self.record_error(error_msg)
            return {'error': error_msg}
    
    def collect_network_data(self):
        """Collect network connection data"""
        try:
            connections = []
            for conn in psutil.net_connections(kind='inet'):
                try:
                    conn_info = {
                        'local_address': f"{conn.laddr.ip}:{conn.laddr.port}" if conn.laddr else None,
                        'remote_address': f"{conn.raddr.ip}:{conn.raddr.port}" if conn.raddr else None,
                        'status': conn.status,
                        'pid': conn.pid,
                    }
                    
                    # Get process name if possible
                    if conn.pid:
                        try:
                            proc = psutil.Process(conn.pid)
                            conn_info['process_name'] = proc.name()
                            conn_info['process_user'] = proc.username()
                        except (psutil.NoSuchProcess, psutil.AccessDenied):
                            conn_info['process_name'] = 'unknown'
                            conn_info['process_user'] = 'unknown'
                    
                    connections.append(conn_info)
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
            
            net_io = psutil.net_io_counters()
            return {
                'connections': connections[:20],
                'bytes_sent': net_io.bytes_sent if net_io else 0,
                'bytes_recv': net_io.bytes_recv if net_io else 0,
                'open_ports': self.get_open_ports()
            }
        except Exception as e:
            error_msg = f"Error collecting network data: {str(e)}"
            self.record_error(error_msg)
            return {'error': error_msg}
    
    def collect_resource_data(self):
        """Collect resource usage and anomalies"""
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            disk_io = psutil.disk_io_counters()
            
            return {
                'cpu_percent': cpu_percent,
                'memory_percent': memory.percent,
                'disk_percent': disk.percent,
                'disk_read_bytes': disk_io.read_bytes if disk_io else 0,
                'disk_write_bytes': disk_io.write_bytes if disk_io else 0,
                'zombie_processes': len([p for p in psutil.process_iter() if p.status() == 'zombie'])
            }
        except Exception as e:
            error_msg = f"Error collecting resource data: {str(e)}"
            self.record_error(error_msg)
            return {'error': error_msg}
    
    def record_error(self, error_message):
        """Record agent errors for reporting"""
        self.error_count += 1
        logging.error(f"Agent error recorded: {error_message}")
    
    def get_agent_errors(self):
        """Get current agent error state"""
        errors = {
            'total_errors': self.error_count,
            'high_error_rate': self.error_count > self.max_errors
        }
        return errors
    
    # Helper methods for data collection
    def get_failed_logins(self):
        """Get failed login attempts from auth logs"""
        log_files = ['/var/log/auth.log', '/var/log/secure']
        failed_count = 0
        
        for log_file in log_files:
            try:
                if os.path.exists(log_file):
                    result = subprocess.run(
                        ['grep', '-c', 'Failed', log_file],
                        capture_output=True, text=True, timeout=5
                    )
                    if result.returncode == 0:
                        failed_count += int(result.stdout.strip())
            except (subprocess.TimeoutExpired, FileNotFoundError, ValueError):
                continue
        
        return failed_count
    
    def get_successful_logins(self):
        """Get successful login attempts from auth logs"""
        log_files = ['/var/log/auth.log', '/var/log/secure']
        success_count = 0
        
        for log_file in log_files:
            try:
                if os.path.exists(log_file):
                    result = subprocess.run(
                        ['grep', '-c', 'Accepted', log_file],
                        capture_output=True, text=True, timeout=5
                    )
                    if result.returncode == 0:
                        success_count += int(result.stdout.strip())
            except (subprocess.TimeoutExpired, FileNotFoundError, ValueError):
                continue
        
        return success_count
    
    def get_user_changes(self):
        """Get user account changes from auth logs"""
        log_files = ['/var/log/auth.log', '/var/log/secure']
        changes_count = 0
        
        for log_file in log_files:
            try:
                if os.path.exists(log_file):
                    result = subprocess.run(
                        ['grep', '-c', 'useradd\\|usermod', log_file],
                        capture_output=True, text=True, timeout=5
                    )
                    if result.returncode == 0:
                        changes_count += int(result.stdout.strip())
            except (subprocess.TimeoutExpired, FileNotFoundError, ValueError):
                continue
        
        return changes_count
    
    def get_sudo_events(self):
        """Get sudo events from auth logs"""
        log_files = ['/var/log/auth.log', '/var/log/secure']
        sudo_count = 0
        
        for log_file in log_files:
            try:
                if os.path.exists(log_file):
                    result = subprocess.run(
                        ['grep', '-c', 'sudo:', log_file],
                        capture_output=True, text=True, timeout=5
                    )
                    if result.returncode == 0:
                        sudo_count += int(result.stdout.strip())
            except (subprocess.TimeoutExpired, FileNotFoundError, ValueError):
                continue
        
        return sudo_count
    
    def get_open_ports(self):
        """Get count of open ports"""
        try:
            result = subprocess.run(['ss', '-tuln'], capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                lines = [line for line in result.stdout.split('\n') if line.strip() and not line.startswith('State')]
                return len(lines)
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pass
        return 0
    
    def get_recently_modified_files(self):
        """Get count of recently modified files in /etc"""
        try:
            result = subprocess.run(
                ['find', '/etc', '-type', 'f', '-mtime', '-1'],
                capture_output=True, text=True, timeout=10
            )
            if result.returncode == 0:
                files = [f for f in result.stdout.split('\n') if f.strip()]
                return len(files)
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pass
        return 0
    
    def get_recent_syslog(self):
        """Get recent syslog entries count"""
        log_files = ['/var/log/syslog', '/var/log/messages']
        for log_file in log_files:
            try:
                if os.path.exists(log_file):
                    result = subprocess.run(
                        ['tail', '-50', log_file],
                        capture_output=True, text=True, timeout=5
                    )
                    if result.returncode == 0:
                        lines = [line for line in result.stdout.split('\n') if line.strip()]
                        return len(lines)
            except (subprocess.TimeoutExpired, FileNotFoundError):
                continue
        return 0
    
    def get_recent_auth_log(self):
        """Get recent auth log entries count"""
        log_files = ['/var/log/auth.log', '/var/log/secure']
        for log_file in log_files:
            try:
                if os.path.exists(log_file):
                    result = subprocess.run(
                        ['tail', '-50', log_file],
                        capture_output=True, text=True, timeout=5
                    )
                    if result.returncode == 0:
                        lines = [line for line in result.stdout.split('\n') if line.strip()]
                        return len(lines)
            except (subprocess.TimeoutExpired, FileNotFoundError):
                continue
        return 0
    
    def get_selinux_status(self):
        """Check if SELinux is enabled"""
        try:
            result = subprocess.run(['sestatus'], capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                return 'enabled' in result.stdout.lower()
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pass
        return False
    
    def get_firewall_status(self):
        """Check if firewall is active"""
        # Try ufw first (Ubuntu)
        try:
            result = subprocess.run(['ufw', 'status'], capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                return 'active' in result.stdout.lower()
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pass
        
        # Try firewalld (RHEL/CentOS)
        try:
            result = subprocess.run(['firewall-cmd', '--state'], capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                return 'running' in result.stdout.lower()
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pass
        
        return False
    
    def get_connected_devices(self):
        """Get count of connected USB devices"""
        try:
            result = subprocess.run(['lsusb'], capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                lines = [line for line in result.stdout.split('\n') if line.strip()]
                return len(lines)
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pass
        return 0
    
    def get_uptime(self):
        """Get system uptime"""
        try:
            return psutil.boot_time()
        except:
            return 0
    
    def get_scheduled_tasks(self):
        """Get count of scheduled tasks"""
        try:
            result = subprocess.run(['crontab', '-l'], capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                lines = [line for line in result.stdout.split('\n') if line.strip() and not line.startswith('#')]
                return len(lines)
        except (subprocess.TimeoutExpired, FileNotFoundError, subprocess.CalledProcessError):
            pass
        return 0
    
    def get_suspicious_processes(self):
        """Detect suspicious processes"""
        suspicious_keywords = ['miner', 'backdoor', 'shell', 'reverse', 'botnet']
        count = 0
        for proc in psutil.process_iter(['name', 'cmdline']):
            try:
                proc_info = proc.info
                name = proc_info['name'] or ''
                cmdline = ' '.join(proc_info['cmdline'] or [])
                
                for keyword in suspicious_keywords:
                    if keyword in name.lower() or keyword in cmdline.lower():
                        count += 1
                        break
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        return count
    
    def get_ssh_key_changes(self):
        """Check for SSH key file changes"""
        ssh_files = ['/etc/ssh/ssh_host_rsa_key', '/etc/ssh/ssh_host_ecdsa_key']
        changes = 0
        for ssh_file in ssh_files:
            try:
                if os.path.exists(ssh_file):
                    stat = os.stat(ssh_file)
                    if time.time() - stat.st_mtime < 86400:
                        changes += 1
            except OSError:
                continue
        return changes
    
    def get_account_lockouts(self):
        """Get account lockout events"""
        log_files = ['/var/log/auth.log', '/var/log/secure']
        lockouts = 0
        for log_file in log_files:
            try:
                if os.path.exists(log_file):
                    result = subprocess.run(
                        ['grep', '-c', 'locked\\|lockout', log_file],
                        capture_output=True, text=True, timeout=5
                    )
                    if result.returncode == 0:
                        lockouts += int(result.stdout.strip())
            except (subprocess.TimeoutExpired, FileNotFoundError, ValueError):
                continue
        return lockouts
    
    # Additional data collection methods
    def collect_file_integrity_data(self):
        """Collect file integrity monitoring data"""
        return {
            'recently_modified_files': self.get_recently_modified_files(),
            'ssh_key_changes': self.get_ssh_key_changes()
        }
    
    def collect_package_data(self):
        """Collect package and software integrity data"""
        return {
            'package_updates_available': 0,
            'suspicious_packages': 0
        }
    
    def collect_system_logs(self):
        """Collect system log data"""
        return {
            'recent_syslog_entries': self.get_recent_syslog(),
            'recent_auth_entries': self.get_recent_auth_log()
        }
    
    def collect_security_data(self):
        """Collect security tools status"""
        return {
            'selinux_enabled': self.get_selinux_status(),
            'firewall_active': self.get_firewall_status(),
            'antivirus_installed': False
        }
    
    def collect_hardware_data(self):
        """Collect hardware and peripheral data"""
        return {
            'connected_devices': self.get_connected_devices(),
            'usb_devices': self.get_connected_devices()
        }
    
    def collect_environment_data(self):
        """Collect environment and configuration data"""
        return {
            'uptime': self.get_uptime(),
            'scheduled_tasks': self.get_scheduled_tasks(),
            'timezone': time.tzname[0] if time.daylight else time.tzname[1]
        }
    
    def collect_anomaly_data(self):
        """Collect anomaly and threat detection data"""
        return {
            'suspicious_processes': self.get_suspicious_processes(),
            'high_cpu_processes': 0,
            'unusual_network_connections': 0
        }
    
    def collect_other_data(self):
        """Collect other miscellaneous data"""
        return {
            'agent_version': '1.0.2',
            'python_version': f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
            'platform': sys.platform
        }
    
    def send_logs_to_server(self, data):
        """Send encrypted log data to central server"""
        if not self.check_agent_status():
            logging.warning("Agent is not active or approved. Skipping log send.")
            return False
        
        try:
            timestamp = datetime.utcnow().isoformat()
            
            # Try with encryption first
            if self.encryption_mgr:
                try:
                    # Encrypt the data
                    encrypted_data = self.encryption_mgr.encrypt_data(data)
                    
                    # Prepare payload with encrypted_data field
                    payload = {
                        'hostname': self.config['hostname'],
                        'username': self.config['username'],
                        'timestamp': timestamp,
                        'encrypted_data': encrypted_data
                    }
                    
                    logging.debug(f"Sending encrypted log payload")
                    
                    # Send to server
                    response = requests.post(
                        self.logs_url,
                        json=payload,
                        timeout=self.config['timeout']
                    )
                    
                    if response.status_code == 200:
                        logging.info("Logs sent successfully (encrypted)")
                        self.error_count = 0
                        return True
                    elif response.status_code == 403:
                        logging.warning("Agent not authorized. Registration may be pending approval.")
                        self.agent_active = False
                        return False
                    elif response.status_code == 400:
                        error_text = response.text
                        logging.warning(f"Encrypted upload failed (400): {error_text}")
                        # Fall through to try unencrypted
                    else:
                        logging.error(f"Server returned error: {response.status_code} - {response.text}")
                        return False
                        
                except Exception as encryption_error:
                    logging.warning(f"Encryption failed: {encryption_error}, trying without encryption")
            
            # Try without encryption (fallback)
            logging.info("Attempting to send logs without encryption")
            
            payload_unencrypted = {
                'hostname': self.config['hostname'],
                'username': self.config['username'],
                'timestamp': timestamp,
                'logs': data if isinstance(data, list) else [data]
            }
            
            response = requests.post(
                self.logs_url,
                json=payload_unencrypted,
                timeout=self.config['timeout']
            )
            
            if response.status_code == 200:
                logging.info("Logs sent successfully (unencrypted)")
                self.error_count = 0
                return True
            elif response.status_code == 403:
                logging.warning("Agent not authorized. Registration may be pending approval.")
                self.agent_active = False
                return False
            else:
                logging.error(f"Server returned error: {response.status_code} - {response.text}")
                return False
                
        except requests.exceptions.RequestException as e:
            logging.error(f"Network error sending logs: {e}")
            return False
        except Exception as e:
            logging.error(f"Error sending logs: {e}")
            import traceback
            logging.error(f"Traceback: {traceback.format_exc()}")
            return False
    
    def run_monitoring_cycle(self):
        """Run one monitoring cycle"""
        try:
            logging.info("Starting monitoring cycle...")
            
            # Collect and send metrics data (always sent immediately)
            metrics_data = self.collect_metrics_data()
            print(metrics_data)
            if metrics_data:
                self.send_metrics_to_server(metrics_data)
            
            # Collect and send process data (sent every cycle)
            process_data = self.collect_process_data_detailed()
            if process_data:
                self.send_processes_to_server(process_data)
            
            # Collect system logs data (batched)
            log_data = self.collect_all_data()
            self.data_buffer.append(log_data)
            
            # Send logs if we have enough data or enough time has passed
            current_time = time.time()
            if (len(self.data_buffer) >= self.config['batch_size'] or 
                current_time - self.last_send > self.config['interval']):
                
                if self.send_logs_to_server(self.data_buffer):
                    self.data_buffer = []
                    self.last_send = current_time
                else:
                    # Keep data in buffer for retry, but limit buffer size
                    if len(self.data_buffer) > self.config['batch_size'] * 2:
                        logging.warning("Buffer full, discarding old data")
                        self.data_buffer = self.data_buffer[-self.config['batch_size']:]
            
            logging.info("Monitoring cycle completed")
            
        except Exception as e:
            error_msg = f"Error in monitoring cycle: {e}"
            logging.error(error_msg)
            self.record_error(error_msg)
    
    def start(self):
        """Start the monitoring agent"""
        logging.info("Starting Enhanced System Monitoring Agent v1.0.2")
        logging.info(f"Hostname: {self.config['hostname']}")
        logging.info(f"Monitoring interval: {self.config['interval']} seconds")
        logging.info(f"Encryption: {'Enabled' if self.encryption_mgr else 'Disabled'}")
        logging.info(f"Logs endpoint: {self.logs_url}")
        logging.info(f"Metrics endpoint: {self.metrics_url}")
        logging.info(f"Processes endpoint: {self.processes_url}")
        
        self.running = True
        
        try:
            while self.running:
                start_time = time.time()
                
                self.run_monitoring_cycle()
                
                # Calculate sleep time to maintain interval
                elapsed = time.time() - start_time
                sleep_time = max(1, self.config['interval'] - elapsed)
                
                # Check for stop signal during sleep
                for _ in range(int(sleep_time)):
                    if not self.running:
                        break
                    time.sleep(1)
                    
        except KeyboardInterrupt:
            logging.info("Received interrupt signal")
        except Exception as e:
            logging.error(f"Unexpected error in main loop: {e}")
            import traceback
            logging.error(f"Traceback: {traceback.format_exc()}")
        finally:
            self.stop()
    
    def stop(self):
        """Stop the monitoring agent"""
        logging.info("Stopping Enhanced System Monitoring Agent")
        self.running = False
        
        # Send any remaining data
        if self.data_buffer:
            logging.info("Sending remaining log data...")
            self.send_logs_to_server(self.data_buffer)


def main():
    """Main entry point"""
    # Check for installation mode
    if len(sys.argv) > 1 and sys.argv[1] == 'install':
        if Installer.install():
            print("\n✅ Installation completed successfully!")
            sys.exit(0)
        else:
            print("\n❌ Installation failed!")
            sys.exit(1)
    
    # Check for setup mode
    if len(sys.argv) > 1 and sys.argv[1] == 'setup':
        config_manager = ConfigManager(CONFIG['config_file'])
        config_manager.setup_config()
        print("\n✅ Setup completed successfully!")
        print("\nYou can now run the agent with:")
        print(f"  python3 {os.path.abspath(__file__)}")
        sys.exit(0)
    
    # Setup logging
    setup_logging()
    
    # Check dependencies
    if not DEPENDENCIES_INSTALLED:
        logging.error("Required dependencies not installed.")
        logging.error("Please run: python3 system_monitor.py install")
        sys.exit(1)
    
    # Load configuration
    config_manager = ConfigManager(CONFIG['config_file'])
    config = config_manager.load_config()
    
    if not config:
        logging.error("No configuration found. Please run setup first:")
        logging.error("  python3 system_monitor.py setup")
        sys.exit(1)
    
    # Check encryption password
    if not config.get('encryption_password'):
        logging.error("Encryption password not configured. Please run setup.")
        sys.exit(1)
    
    # Create and start monitor
    monitor = SystemMonitor(config_manager)
    
    try:
        monitor.start()
    except KeyboardInterrupt:
        logging.info("Agent stopped by user")
    except Exception as e:
        logging.error(f"Agent crashed: {e}")
        import traceback
        logging.error(f"Traceback: {traceback.format_exc()}")
        sys.exit(1)


if __name__ == "__main__":
    main()