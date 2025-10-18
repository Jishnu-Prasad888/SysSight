# SysSight : System Monitoring Dashboard

A comprehensive system monitoring solution built with React frontend and Django backend that provides real-time monitoring, alerting, and management of distributed monitoring agents.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Screenshots](#screenshots)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [API Endpoints](#api-endpoints)
- [Usage](#usage)

## Overview

This System Monitoring Dashboard is a full-stack application designed to monitor multiple systems through distributed agents. It provides real-time insights into system metrics, process monitoring, security alerts, and centralized management of monitoring agents.

## Features

### 🔍 Monitoring & Analytics

- **Real-time Dashboard**: Comprehensive overview of system health and agent status
- **Host Metrics**: CPU, memory, disk, and network usage monitoring
- **Process Monitoring**: Live process tracking and resource consumption analysis
- **Security Alerts**: Automated threat detection and alerting system

### 🤖 Agent Management

- **Agent Registration**: Secure registration and approval workflow
- **Centralized Control**: Activate/deactivate agents remotely
- **Configuration Management**: Dynamic agent configuration updates
- **Status Monitoring**: Real-time agent health and connectivity status

### 🚨 Alert System

- **Multi-level Alerts**: Critical, high, medium, and low priority alerts
- **Resource Thresholds**: Customizable resource usage thresholds
- **Security Detection**: Authentication failures, suspicious processes, network anomalies
- **Bulk Operations**: Mass resolve, unresolve, and delete alerts

### 🔒 Security & Authentication

- **JWT Authentication**: Secure user authentication system
- **Role-based Access**: Different permissions for admin and regular users
- **Encrypted Communication**: Secure data transmission between agents and server
- **Protected Routes**: Frontend route protection based on authentication

## Screenshots

### Login Interface

![Login Screen](login.jpeg)
_Secure login interface with authentication_

### Main Dashboard

![Dashboard](dashboard.jpeg)
_Comprehensive overview showing system statistics and agent status_

### Agent Management

![Agent Manager](agent%20manager.jpeg)
_Centralized management of all monitoring agents_

### Metrics Monitoring

![Metrics](metrics.jpeg)
_Detailed host metrics and resource usage graphs_

### Process Monitoring

![Process Monitor](process.jpeg)
_Real-time process tracking and resource analysis_

### Alert Management

![Alerts Panel](alerts.jpeg)
_Security alerts and notification management_

## Technology Stack

### Frontend

- **React 18** - Modern React with hooks and functional components
- **React Router v7** - Client-side routing with protected routes
- **Lucide React** - Modern icon library
- **Context API** - State management for authentication
- **Lazy Loading** - Code splitting for optimal performance

### Backend

- **Django 4.x** - Python web framework
- **Django REST Framework** - REST API implementation
- **PostgreSQL** - Primary database (recommended)
- **JWT Authentication** - Secure token-based authentication
- **Custom Encryption** - Secure data transmission

### Key Libraries & Tools

- **Colorama** - Terminal text styling
- **Threading** - Background task processing
- **SMTP Integration** - Email notifications
- **Requests** - HTTP client for external integrations

## Project Structure

```
src/
├── components/                 # React components
│   ├── Layout.jsx            # Main layout wrapper
│   ├── Login.jsx             # Authentication component
│   ├── Register.jsx          # User registration
│   ├── Dashboard.jsx         # Main dashboard
│   ├── AlertsPanel.jsx       # Alert management
│   ├── AgentRegistrationManager.jsx  # Agent management
│   ├── HostMetrics.jsx       # Metrics visualization
│   ├── ProcessMonitor.jsx    # Process tracking
│   ├── Settings.jsx          # System settings
│   ├── ProtectedRoute.jsx    # Route protection
│   └── ErrorBoundary.jsx     # Error handling
├── context/
│   └── AuthContext.jsx       # Authentication state management
└── App.jsx                   # Main application component

backend/
├── views.py                  # Django viewset implementations
├── models.py                 # Database models
├── serializers.py            # API serializers
└── utils.py                  # Utility functions
```

## Installation

### Prerequisites

- Node.js 16+ and npm
- Python 3.8+
- PostgreSQL database
- Virtual environment tool (venv or conda)

### Environment Configuration

Create `.env` files for both frontend and backend with appropriate configuration for:

- Database connections
- JWT secret keys
- Encryption keys
- SMTP settings for notifications

## API Endpoints

### Authentication

- `POST /api/auth/login/` - User login
- `POST /api/auth/register/` - User registration

### Agent Management

- `GET /api/agents/` - List all agents
- `POST /api/agents/` - Create new agent
- `POST /api/agents/{id}/approve/` - Approve agent
- `POST /api/agents/{id}/disapprove/` - Disapprove agent
- `GET /api/agents/config_by_hostname/` - Get agent configuration

### Monitoring Data

- `POST /api/logs/upload_logs/` - Upload system logs
- `GET /api/metrics/` - Retrieve host metrics
- `POST /api/metrics/upload_metrics/` - Upload metrics data
- `GET /api/processes/get_processes/` - Get process information

### Alert System

- `GET /api/alerts/` - List all alerts
- `POST /api/alerts/bulk_resolve/` - Bulk resolve alerts
- `POST /api/alerts/{id}/resolve/` - Resolve specific alert

### Registration Requests

- `POST /api/registrations/` - Submit registration request
- `POST /api/registrations/{id}/approve/` - Approve registration
- `GET /api/registrations/pending/` - Get pending requests

## Usage

### Getting Started

1. **Access the Application**: Navigate to the application URL
2. **Login**: Use your credentials to access the dashboard
3. **Register Agents**: Set up monitoring agents on target systems
4. **Configure Monitoring**: Set up resource thresholds and alert rules
5. **Monitor Systems**: View real-time metrics and alerts

### Agent Registration Process

1. Agent sends registration request to the server
2. Administrator reviews and approves the request
3. Agent receives configuration and begins monitoring
4. Data is encrypted and transmitted to the server
5. Alerts are generated based on configured thresholds

### Alert Management

- **View Alerts**: Check the alerts panel for active issues
- **Resolve Alerts**: Mark alerts as resolved when addressed
- **Configure Thresholds**: Set custom thresholds for resource usage
- **Notification Channels**: Set up email or Discord notifications

### System Requirements for Agents

- Python 3.8+
- Network connectivity to the monitoring server
- Appropriate permissions for system monitoring ( root )
- Storage for temporary log files

# SysSight : Client / Agent

The System Monitoring Agent is a comprehensive Python-based monitoring solution that collects system data and securely transmits it to a central monitoring dashboard. It's designed to run as a background service on Linux systems.

## 🚀 Features

### 📊 Comprehensive System Monitoring

- **Host Metrics**: Real-time CPU, memory, disk, and network usage
- **Process Monitoring**: Detailed process information including CPU/memory usage, user context, and command lines
- **User Sessions**: Track logged-in users and session information
- **Network Connections**: Monitor active network connections and open ports
- **System Resources**: Disk I/O, load averages, and resource anomalies

### 🔒 Security & Authentication

- **Encrypted Communication**: All data is encrypted using Fernet symmetric encryption
- **Secure Registration**: Agent registration with central server approval workflow
- **Authentication Monitoring**: Track login attempts, sudo events, and user changes
- **Security Scanning**: Detect suspicious processes and security events

### ⚙️ Automated Deployment

- **Easy Installation**: One-command installation with dependency management
- **Systemd Integration**: Automatic service registration and management
- **Configuration Wizard**: Interactive setup for server configuration
- **Virtual Environment**: Isolated Python environment for dependencies

## 📋 Prerequisites

- **Python 3.6+**
- **Root/sudo access** (recommended for full functionality)
- **Internet connectivity** to central monitoring server
- **Linux system** (tested on Ubuntu, CentOS, Debian)

## 🛠 Installation

### Quick Installation

```bash
# Download the script and run installation
wget https://your-server.com/system_monitor.py
sudo python3 system_monitor.py install
```

### Manual Installation Steps

1. **Run the installer**:

   ```bash
   sudo python3 system_monitor.py install
   ```

2. **Configure the agent**:

   ```bash
   sudo python3 system_monitor.py setup
   ```

3. **Start the service**:
   ```bash
   sudo systemctl start system-monitor
   sudo systemctl enable system-monitor
   ```

## ⚙️ Configuration

During setup, you'll configure:

- **Server URL**: Central monitoring server endpoint
- **Encryption Password**: Secure password for data encryption
- **Monitoring Scope**: Monitor all users or specific users only
- **Collection Interval**: How often to collect and send data (default: 60 seconds)

### Configuration File Location

- Primary: `/etc/system_monitor/config.json`
- Logs: `/var/log/system_monitor/system_monitor.log`
- Installation: `/opt/system_monitor/`

## 🔧 Usage

### Service Management

```bash
# Start the service
sudo systemctl start system-monitor

# Stop the service
sudo systemctl stop system-monitor

# Check status
sudo systemctl status system-monitor

# View logs
journalctl -u system-monitor -f
```

### Manual Operation

```bash
# Run manually (for testing)
sudo python3 /opt/system_monitor/system_monitor.py

# Run in foreground with debug output
sudo python3 /opt/system_monitor/system_monitor.py --debug
```

### Agent Registration Process

1. Agent sends registration request to central server
2. Administrator approves the request in the web dashboard
3. Agent begins encrypted data transmission
4. Real-time monitoring data appears in the dashboard

## 📊 Data Collection

### Metrics Collected

- **System Metrics**

  - CPU usage percentage
  - Memory usage and statistics
  - Disk usage and I/O statistics
  - Network traffic and connections
  - System load averages

- **Process Information**

  - All running processes with detailed attributes
  - Top CPU and memory consumers
  - Process hierarchy and relationships
  - User context and privileges

- **Security Data**

  - Authentication events and login attempts
  - Sudo and privilege escalation events
  - User session tracking
  - Suspicious process detection

- **System State**
  - Logged-in users and sessions
  - Network connection states
  - System uptime and health
  - Hardware and peripheral status

## 🔒 Security Features

### Data Encryption

- All transmitted data is encrypted using AES-128 encryption
- Password-based key derivation (PBKDF2)
- Secure salt management
- Fallback to unencrypted transmission if encryption fails

### Access Control

- Root privilege escalation only when necessary
- Secure configuration file permissions (600)
- Isolated virtual environment
- Limited filesystem access

### Network Security

- HTTPS support for server communication
- Configurable timeouts and retries
- Server certificate validation
- Secure credential storage

## 🐛 Troubleshooting

### Common Issues

**Agent not sending data:**

- Check agent registration status in web dashboard
- Verify server URL in configuration
- Check network connectivity to server

**Permission errors:**

- Ensure script is running with appropriate privileges
- Verify configuration file permissions
- Check log directory accessibility

**Dependency issues:**

- Reinstall dependencies: `sudo pip3 install psutil requests cryptography`
- Verify Python version compatibility

### Logs and Debugging

```bash
# View systemd logs
journalctl -u system-monitor -n 50

# Check agent logs
tail -f /var/log/system_monitor/system_monitor.log

# Test connectivity manually
python3 -c "import requests; requests.get('https://your-server.com/api/agents/config_by_hostname/')"
```

## 📁 File Structure

```
/opt/system_monitor/
├── system_monitor.py          # Main agent script
├── venv/                      # Python virtual environment
└── config.json               # Agent configuration

/etc/system_monitor/
└── config.json               # Primary configuration

/var/log/system_monitor/
└── system_monitor.log        # Agent logs
```

## 🔄 API Integration

The agent communicates with these API endpoints:

- **Registration**: `POST /api/registrations/`
- **Log Upload**: `POST /api/logs/upload_logs/`
- **Metrics**: `POST /api/metrics/upload_metrics/`
- **Processes**: `POST /api/processes/upload_processes/`
- **Configuration**: `GET /api/agents/config_by_hostname/`

## 📝 Monitoring Best Practices

### Resource Considerations

- Default interval: 60 seconds (adjust based on system load)
- Batch size: 50 records per transmission
- Memory usage: Typically < 100MB
- CPU impact: < 2% during collection cycles

### Security Recommendations

- Use strong encryption passwords
- Regularly rotate encryption credentials
- Monitor agent logs for security events
- Keep the agent updated with latest versions

### Performance Tuning

- Adjust collection interval for busy systems
- Modify batch size for network constraints
- Configure specific user monitoring to reduce load
- Set appropriate log retention policies

## 🤝 Support

For issues and support:

1. Check logs in `/var/log/system_monitor/`
2. Verify configuration in `/etc/system_monitor/config.json`
3. Test network connectivity to central server
4. Review systemd service status
