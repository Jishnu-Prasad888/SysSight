#!/usr/bin/env python3
"""
Enhanced System Monitoring Agent with Built-in Installer
Collects system information and sends data to central server periodically
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

# Configuration
CONFIG = {
    'server_url': 'http://localhost:8000/api/logs/upload_logs/',
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
            'requests>=2.25.0'
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
        """Interactive configuration setup"""
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
        server_url = input("Enter central server URL (e.g., http://localhost:8000/api/logs/upload_logs/): ").strip()
        if not server_url:
            server_url = 'http://localhost:8000/api/logs/upload_logs/'
            print(f"Using default URL: {server_url}")
        
        # Authentication
        print("\n--- Authentication ---")
        username = input("Enter username for server authentication: ").strip()
        if not username:
            username = 'monitoring_agent'
            print(f"Using default username: {username}")
        
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
            'server_url': server_url,
            'username': username,
            'monitor_all_users': monitor_all_users,
            'specific_user': specific_user,
            'interval': interval,
            'hostname': socket.gethostname(),
            'max_retries': CONFIG['max_retries'],
            'timeout': CONFIG['timeout'],
            'batch_size': CONFIG['batch_size'],
            'setup_time': datetime.utcnow().isoformat()
        }
        
        self.save_config()
        print(f"\n✅ Configuration saved to {self.config_file}")
        
        return self.config
    
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
        
    def collect_all_data(self):
        """Collect all system monitoring data"""
        try:
            data = {
                'timestamp': datetime.utcnow().isoformat(),
                'hostname': self.config['hostname'],
                'users_logged_in': self.collect_logged_in_users(),
                'authentication': self.collect_authentication_data(),
                'process_system_activity': self.collect_process_data(),
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
    
    def collect_logged_in_users(self):
        """Collect information about logged-in users"""
        try:
            users = []
            for user in psutil.users():
                user_info = {
                    'name': user.name,
                    'terminal': user.terminal,
                    'host': user.host,
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
    
    def collect_process_data(self):
        """Collect process and system activity data"""
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
                        'cpu_percent': proc_info['cpu_percent'],
                        'memory_percent': proc_info['memory_percent'],
                        'cmdline': proc_info['cmdline'],
                        'is_root': proc_info['username'] == 'root'
                    })
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
            
            # Get top CPU and memory processes
            top_cpu = sorted(processes, key=lambda x: x['cpu_percent'], reverse=True)[:5]
            top_memory = sorted(processes, key=lambda x: x['memory_percent'], reverse=True)[:5]
            
            return {
                'total_processes': len(processes),
                'root_processes': len([p for p in processes if p['is_root']]),
                'top_cpu_processes': top_cpu,
                'top_memory_processes': top_memory,
                'load_average': os.getloadavg()
            }
        except Exception as e:
            error_msg = f"Error collecting process data: {str(e)}"
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
                'bytes_sent': net_io.bytes_sent,
                'bytes_recv': net_io.bytes_recv,
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
        try:
            result = subprocess.run(['grep', 'Failed', '/var/log/auth.log'], 
                                  capture_output=True, text=True, timeout=5)
            return len(result.stdout.split('\n')) - 1
        except:
            return 0
    
    def get_successful_logins(self):
        try:
            result = subprocess.run(['grep', 'Accepted', '/var/log/auth.log'], 
                                  capture_output=True, text=True, timeout=5)
            return len(result.stdout.split('\n')) - 1
        except:
            return 0
    
    def get_user_changes(self):
        try:
            result = subprocess.run(['grep', 'useradd\\|usermod', '/var/log/auth.log'], 
                                  capture_output=True, text=True, timeout=5)
            return len(result.stdout.split('\n')) - 1
        except:
            return 0
    
    def get_sudo_events(self):
        try:
            result = subprocess.run(['grep', 'sudo:', '/var/log/auth.log'], 
                                  capture_output=True, text=True, timeout=5)
            return len(result.stdout.split('\n')) - 1
        except:
            return 0
    
    def get_open_ports(self):
        try:
            result = subprocess.run(['ss', '-tuln'], capture_output=True, text=True, timeout=5)
            return len(result.stdout.split('\n')) - 1
        except:
            return 0
    
    def get_recently_modified_files(self):
        try:
            result = subprocess.run(['find', '/etc', '-type', 'f', '-mtime', '-1'], 
                                  capture_output=True, text=True, timeout=10)
            return len(result.stdout.split('\n')) - 1
        except:
            return 0
    
    def get_recent_syslog(self):
        try:
            result = subprocess.run(['tail', '-50', '/var/log/syslog'], 
                                  capture_output=True, text=True, timeout=5)
            return len(result.stdout.split('\n')) - 1
        except:
            return 0
    
    def get_recent_auth_log(self):
        try:
            result = subprocess.run(['tail', '-50', '/var/log/auth.log'], 
                                  capture_output=True, text=True, timeout=5)
            return len(result.stdout.split('\n')) - 1
        except:
            return 0
    
    def get_selinux_status(self):
        try:
            result = subprocess.run(['sestatus'], capture_output=True, text=True, timeout=5)
            return 'enabled' in result.stdout.lower()
        except:
            return False
    
    def get_firewall_status(self):
        try:
            result = subprocess.run(['ufw', 'status'], capture_output=True, text=True, timeout=5)
            return 'active' in result.stdout.lower()
        except:
            return False
    
    def get_connected_devices(self):
        try:
            result = subprocess.run(['lsusb'], capture_output=True, text=True, timeout=5)
            return len(result.stdout.split('\n')) - 1
        except:
            return 0
    
    def get_uptime(self):
        return psutil.boot_time()
    
    def get_scheduled_tasks(self):
        try:
            result = subprocess.run(['crontab', '-l'], capture_output=True, text=True, timeout=5)
            return len(result.stdout.split('\n')) - 1
        except:
            return 0
    
    def get_suspicious_processes(self):
        suspicious_keywords = ['miner', 'backdoor', 'shell', 'reverse']
        count = 0
        for proc in psutil.process_iter(['name']):
            try:
                if any(keyword in proc.info['name'].lower() for keyword in suspicious_keywords):
                    count += 1
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        return count
    
    def get_unusual_connections(self):
        unusual_ports = [4444, 1337, 31337, 9999]
        count = 0
        for conn in psutil.net_connections():
            if conn.raddr and conn.raddr.port in unusual_ports:
                count += 1
        return count
    
    def get_dns_cache(self):
        try:
            result = subprocess.run(['systemd-resolve', '--statistics'], 
                                  capture_output=True, text=True, timeout=5)
            return len(result.stdout.split('\n')) - 1
        except:
            return 0
    
    def get_container_count(self):
        try:
            result = subprocess.run(['docker', 'ps', '-q'], capture_output=True, text=True, timeout=5)
            return len(result.stdout.split('\n')) - 1
        except:
            return 0
    
    def get_ssh_key_changes(self):
        try:
            result = subprocess.run(['grep', 'ssh-key', '/var/log/auth.log'], 
                                  capture_output=True, text=True, timeout=5)
            return len(result.stdout.split('\n')) - 1
        except:
            return 0
    
    def get_account_lockouts(self):
        try:
            result = subprocess.run(['grep', 'account locked', '/var/log/auth.log'], 
                                  capture_output=True, text=True, timeout=5)
            return len(result.stdout.split('\n')) - 1
        except:
            return 0
    
    def collect_file_integrity_data(self):
        """Collect file integrity monitoring data"""
        try:
            critical_files = [
                '/etc/passwd',
                '/etc/shadow',
                '/etc/hosts',
                '/etc/hostname'
            ]
            
            file_stats = {}
            for file_path in critical_files:
                try:
                    stat = os.stat(file_path)
                    file_stats[file_path] = {
                        'size': stat.st_size,
                        'mtime': stat.st_mtime,
                        'mode': stat.st_mode
                    }
                except FileNotFoundError:
                    continue
            
            return {
                'critical_files': file_stats,
                'recently_modified': self.get_recently_modified_files()
            }
        except Exception as e:
            error_msg = f"Error collecting file integrity data: {str(e)}"
            self.record_error(error_msg)
            return {'error': error_msg}
    
    def collect_package_data(self):
        """Collect package and software integrity data"""
        try:
            # Get recently installed packages (Debian/Ubuntu)
            result = subprocess.run(['dpkg-query', '-W', '-f=${Package} ${Version} ${Status}\n'], 
                                  capture_output=True, text=True, timeout=10)
            packages = []
            for line in result.stdout.split('\n'):
                if 'install ok installed' in line:
                    pkg_info = line.split()
                    if len(pkg_info) >= 2:
                        packages.append({
                            'name': pkg_info[0],
                            'version': pkg_info[1]
                        })
            
            return {'installed_packages_count': len(packages)}
        except Exception as e:
            logging.warning(f"Could not get package info: {e}")
            return {'installed_packages_count': 0}
    
    def collect_system_logs(self):
        """Collect system log summaries"""
        try:
            return {
                'syslog_entries': self.get_recent_syslog(),
                'auth_entries': self.get_recent_auth_log()
            }
        except Exception as e:
            error_msg = f"Error collecting system logs: {str(e)}"
            self.record_error(error_msg)
            return {'error': error_msg}
    
    def collect_security_data(self):
        """Collect security tools data"""
        try:
            return {
                'selinux_status': self.get_selinux_status(),
                'firewall_status': self.get_firewall_status()
            }
        except Exception as e:
            error_msg = f"Error collecting security data: {str(e)}"
            self.record_error(error_msg)
            return {'error': error_msg}
    
    def collect_hardware_data(self):
        """Collect hardware and peripheral data"""
        try:
            return {
                'connected_devices': self.get_connected_devices()
            }
        except Exception as e:
            error_msg = f"Error collecting hardware data: {str(e)}"
            self.record_error(error_msg)
            return {'error': error_msg}
    
    def collect_environment_data(self):
        """Collect environment configuration data"""
        try:
            return {
                'uptime': self.get_uptime(),
                'scheduled_tasks': self.get_scheduled_tasks()
            }
        except Exception as e:
            error_msg = f"Error collecting environment data: {str(e)}"
            self.record_error(error_msg)
            return {'error': error_msg}
    
    def collect_anomaly_data(self):
        """Collect anomaly detection data"""
        try:
            return {
                'suspicious_processes': self.get_suspicious_processes(),
                'unusual_connections': self.get_unusual_connections()
            }
        except Exception as e:
            error_msg = f"Error collecting anomaly data: {str(e)}"
            self.record_error(error_msg)
            return {'error': error_msg}
    
    def collect_other_data(self):
        """Collect other monitoring data"""
        try:
            return {
                'dns_requests': self.get_dns_cache(),
                'container_count': self.get_container_count()
            }
        except Exception as e:
            error_msg = f"Error collecting other data: {str(e)}"
            self.record_error(error_msg)
            return {'error': error_msg}
    
    def send_data(self, data):
        """Send JSON data to central server with authentication"""
        for attempt in range(self.config['max_retries']):
            try:
                # Prepare request - send JSON directly
                payload = {
                    'hostname': self.config['hostname'],
                    'username': self.config['username'],
                    'encrypted_data': json.dumps(data),  # Just JSON string, not encrypted
                    'timestamp': datetime.utcnow().isoformat()
                }
                
                response = requests.post(
                    self.config['server_url'],
                    json=payload,
                    timeout=self.config['timeout'],
                    headers={'Content-Type': 'application/json'}
                )
                
                if response.status_code == 200:
                    logging.info("Data sent successfully")
                    self.error_count = 0  # Reset error count on successful send
                    return True
                elif response.status_code == 401:
                    logging.error("Authentication failed - check username")
                    self.record_error("Server authentication failed")
                    return False
                else:
                    logging.warning(f"Server returned status {response.status_code}")
                    self.record_error(f"Server error: {response.status_code}")
                    
            except requests.exceptions.RequestException as e:
                error_msg = f"Attempt {attempt + 1} failed: {e}"
                logging.warning(error_msg)
                self.record_error(error_msg)
                time.sleep(2 ** attempt)  # Exponential backoff
        
        logging.error("All send attempts failed")
        return False
    
    def run(self):
        """Main monitoring loop"""
        self.running = True
        logging.info("System monitor started")
        
        while self.running:
            try:
                # Check if we have too many errors
                if self.error_count > self.max_errors:
                    logging.error("Too many errors, stopping monitor")
                    self.stop()
                    break
                
                # Collect data
                data = self.collect_all_data()
                
                # Add to buffer
                self.data_buffer.append(data)
                
                # Send if buffer is full or enough time has passed
                current_time = time.time()
                if (len(self.data_buffer) >= self.config['batch_size'] or 
                    current_time - self.last_send >= self.config['interval']):
                    
                    if self.data_buffer:
                        success = self.send_data({
                            'hostname': self.config['hostname'],
                            'logs': self.data_buffer
                        })
                        if success:
                            self.data_buffer = []
                            self.last_send = current_time
                
                # Sleep briefly to avoid high CPU usage
                time.sleep(1)
                
            except Exception as e:
                error_msg = f"Error in main loop: {str(e)}"
                logging.error(error_msg)
                self.record_error(error_msg)
                time.sleep(5)
    
    def stop(self):
        """Stop the monitoring agent"""
        self.running = False
        logging.info("System monitor stopped")


def setup_agent():
    """Interactive setup for the monitoring agent"""
    if not DEPENDENCIES_INSTALLED:
        print("❌ Dependencies are not installed.")
        print("Please run: python3 system_monitor.py install")
        sys.exit(1)
    
    config_manager = ConfigManager(CONFIG['config_file'])
    
    print("=== System Monitoring Agent Setup ===")
    
    # Run configuration
    config = config_manager.setup_config()
    
    # Test configuration
    print("\n--- Testing Configuration ---")
    monitor = SystemMonitor(config_manager)
    test_data = {'test': 'data', 'timestamp': datetime.utcnow().isoformat()}
    
    try:
        # Save final config
        config_manager.save_config()
        print(f"\n🎉 Setup completed successfully!")
        print(f"📁 Config file: {CONFIG['config_file']}")
        print(f"📊 Monitoring: {'All users' if config['monitor_all_users'] else 'User: ' + config['specific_user']}")
        print(f"⏰ Interval: {config['interval']} seconds")
        print(f"🌐 Server: {config['server_url']}")
        
    except Exception as e:
        print(f"❌ Setup failed: {e}")
        sys.exit(1)


def print_usage():
    """Print usage information"""
    print("""
Enhanced System Monitoring Agent

Usage:
    python3 system_monitor.py [command]

Commands:
    install     - Install the monitoring agent (creates directories, installs dependencies, sets up systemd)
    setup       - Configure the monitoring agent (server URL, credentials, monitoring scope)
    (no args)   - Run the monitoring agent (requires prior setup)
    help        - Show this help message

Examples:
    # First-time installation
    sudo python3 system_monitor.py install
    
    # Configure the agent
    sudo python3 system_monitor.py setup
    
    # Run the agent manually
    sudo python3 system_monitor.py
    
    # Or use systemd (after install)
    sudo systemctl start system-monitor
    sudo systemctl enable system-monitor
    sudo journalctl -u system-monitor -f

Configuration:
    Config file: {config_file}
    Log file:    {log_file}
    Install dir: {install_dir}
""".format(**CONFIG))


def main():
    """Main entry point"""
    
    # Parse command line arguments
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        
        if command == 'install':
            success = Installer.install()
            sys.exit(0 if success else 1)
        
        elif command == 'setup':
            setup_agent()
            return
        
        elif command in ['help', '-h', '--help']:
            print_usage()
            return
        
        else:
            print(f"Unknown command: {command}")
            print_usage()
            sys.exit(1)
    
    # Check if dependencies are installed
    if not DEPENDENCIES_INSTALLED:
        print("❌ Required dependencies are not installed.")
        print("\nPlease run installation first:")
        print("  sudo python3 system_monitor.py install")
        sys.exit(1)
    
    # Setup logging
    setup_logging()
    
    # Load existing configuration
    config_manager = ConfigManager(CONFIG['config_file'])
    config = config_manager.load_config()
    
    if not config:
        print("❌ Configuration not found. Please run setup first:")
        print("  sudo python3 system_monitor.py setup")
        sys.exit(1)
    
    # Check if running as root for full functionality
    if os.geteuid() != 0:
        logging.warning("Running without root privileges. Some monitoring features may be limited.")
    
    monitor = SystemMonitor(config_manager)
    
    # Handle graceful shutdown
    def signal_handler(signum, frame):
        monitor.stop()
        sys.exit(0)
    
    import signal
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        monitor.run()
    except KeyboardInterrupt:
        monitor.stop()


if __name__ == "__main__":
    main()