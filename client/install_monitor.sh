#!/bin/bash

# Enhanced System Monitoring Agent Installer

echo "Installing Enhanced System Monitoring Agent..."

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "Python3 is required but not installed. Please install python3."
    exit 1
fi

# Create directories
mkdir -p /opt/system_monitor
mkdir -p /etc/system_monitor
mkdir -p /var/log/system_monitor

# Create virtual environment
python3 -m venv /opt/system_monitor/venv
source /opt/system_monitor/venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy script
cp system_monitor.py /opt/system_monitor/
chmod +x /opt/system_monitor/system_monitor.py

# Create systemd service
cat > /etc/systemd/system/system-monitor.service << EOF
[Unit]
Description=Enhanced System Monitoring Agent
After=network.target
Wants=network.target

[Service]
Type=simple
User=root
ExecStart=/opt/system_monitor/venv/bin/python /opt/system_monitor/system_monitor.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

# Security settings
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=/var/log/system_monitor /etc/system_monitor

[Install]
WantedBy=multi-user.target
EOF

# Set permissions
chmod 600 /etc/systemd/system/system-monitor.service

# Reload systemd
systemctl daemon-reload

echo "Installation complete."
echo ""
echo "Next steps:"
echo "1. Run setup: sudo /opt/system_monitor/venv/bin/python /opt/system_monitor/system_monitor.py setup"
echo "2. Start service: sudo systemctl start system-monitor"
echo "3. Enable auto-start: sudo systemctl enable system-monitor"
echo ""
echo "Check logs: journalctl -u system-monitor -f"