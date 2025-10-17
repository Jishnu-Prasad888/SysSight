from monitoring.models import HostMetric, MonitoringAgent
from django.utils import timezone
from datetime import timedelta

# Get the agent
agent = MonitoringAgent.objects.get(hostname='pop-os')
print(f"Agent: {agent.hostname} (ID: {agent.id})")
# Current time
now_utc = timezone.now()
print(f"Current UTC time: {now_utc}")

# 1 hour ago
one_hour_ago = now_utc - timedelta(hours=1)
print(f"Filtering metrics since: {one_hour_ago}")

# Query metrics in last 1 hour
recent_metrics = HostMetric.objects.filter(agent=agent, timestamp__gte=one_hour_ago)
print(f"Total metrics in the last 1 hour: {recent_metrics.count()}")

# Print first 5 metrics with UTC and local timestamps
for metric in recent_metrics[:5]:
    local_time = timezone.localtime(metric.timestamp)
    print(f"- Metric ID: {metric.id}, UTC: {metric.timestamp}, Local: {local_time}, CPU: {metric.cpu_usage}%, Memory: {metric.memory_usage}%")
