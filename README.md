## **MonitoringAgentViewSet**

**Base URL:** `/api/agents/`

| View/Method                | HTTP Method                         | Purpose                       | Key Features                                                            |
| -------------------------- | ----------------------------------- | ----------------------------- | ----------------------------------------------------------------------- |
| **List/Create**            | GET/POST                            | List all agents or create new | Standard DRF ModelViewSet                                               |
| **Retrieve/Update/Delete** | GET/PUT/PATCH/DELETE                | Single agent operations       | Standard DRF ModelViewSet                                               |
| **stats**                  | GET `/api/agents/stats/`            | Get system statistics         | Returns agent counts, pending registrations, recent logs, active alerts |
| **activate**               | POST `/api/agents/{id}/activate/`   | Activate an agent             | Sets `is_active=True`                                                   |
| **deactivate**             | POST `/api/agents/{id}/deactivate/` | Deactivate an agent           | Sets `is_active=False`                                                  |
| **approve**                | POST `/api/agents/{id}/approve/`    | Approve agent registration    | Sets `is_approved=True`                                                 |
| **config**                 | GET `/api/agents/{id}/config/`      | Get agent configuration       | Returns monitoring scope, interval, version                             |
| **config_by_hostname**     | GET `/api/agent/config/`            | Get config by hostname        | Query param: `?hostname=xxx`                                            |

## **AgentRegistrationViewSet**

**Base URL:** `/api/registrations/`

| View/Method | HTTP Method                             | Purpose                        | Key Features                                           |
| ----------- | --------------------------------------- | ------------------------------ | ------------------------------------------------------ |
| **List**    | GET                                     | List all registration requests | Ordered by `-requested_at`                             |
| **Create**  | POST `/api/agent/register/`             | Register new agent             | Validates hostname uniqueness, creates pending request |
| **approve** | POST `/api/registrations/{id}/approve/` | Approve registration           | Creates MonitoringAgent, updates request status        |
| **reject**  | POST `/api/registrations/{id}/reject/`  | Reject registration            | Sets status to 'rejected', adds notes                  |
| **pending** | GET `/api/registrations/pending/`       | Get pending requests           | Filters by `status='pending'`                          |

## **SystemLogViewSet**

**Base URL:** `/api/logs/`

| View/Method     | HTTP Method                   | Purpose                 | Key Features                                   |
| --------------- | ----------------------------- | ----------------------- | ---------------------------------------------- |
| **List**        | GET                           | List system logs        | Filter by `agent_id`, `hours` (default 24h)    |
| **Retrieve**    | GET                           | Get single log          | Standard DRF                                   |
| **upload_logs** | POST `/api/logs/upload_logs/` | **Main data ingestion** | Handles encrypted/unencrypted logs from agents |

### **upload_logs Key Processing:**

1. **Authentication**: Verifies agent exists and is approved
2. **Decryption**: Handles encrypted data with EncryptionManager
3. **Data Processing**:
   - Saves SystemLog records
   - Extracts and saves UserSession data
   - Generates alerts via AlertGenerator
4. **Error Handling**: Comprehensive logging and error recovery

## **AlertViewSet**

**Base URL:** `/api/alerts/`

| View/Method              | HTTP Method                      | Purpose                | Key Features                              |
| ------------------------ | -------------------------------- | ---------------------- | ----------------------------------------- |
| **List**                 | GET                              | List alerts            | Filter by `resolved`, `level`, `agent`    |
| **Retrieve**             | GET                              | Get single alert       | Standard DRF                              |
| **resolve**              | POST `/api/alerts/{id}/resolve/` | Mark alert as resolved | Sets `resolved=True`, sends notifications |
| **Notification System**: | Background threads               | Send resolution alerts | Email, Discord, Slack, Webhook support    |

## **UserSessionViewSet**

**Base URL:** `/api/sessions/`

| View/Method  | HTTP Method | Purpose            | Key Features             |
| ------------ | ----------- | ------------------ | ------------------------ |
| **List**     | GET         | List user sessions | Ordered by `-login_time` |
| **Retrieve** | GET         | Get single session | Standard DRF             |

## **HostMetricViewSet**

**Base URL:** `/api/metrics/`

| View/Method               | HTTP Method                 | Purpose                     | Key Features                                |
| ------------------------- | --------------------------- | --------------------------- | ------------------------------------------- |
| **List**                  | GET                         | List host metrics           | Filter by `agent_id`, `hours` (default 24h) |
| **upload_metrics**        | POST `/api/metrics/upload/` | Receive metrics from agents | Saves CPU, memory, disk, network data       |
| **Threshold Monitoring**: | Background                  | Check resource thresholds   | Generates alerts for high usage             |

## **ProcessViewSet**

**Base URL:** `/api/processes/`

| View/Method          | HTTP Method                   | Purpose                 | Key Features                                    |
| -------------------- | ----------------------------- | ----------------------- | ----------------------------------------------- |
| **upload_processes** | POST `/api/processes/upload/` | Receive process lists   | Saves process snapshots                         |
| **get_processes**    | GET `/api/processes/list/`    | Get processes for agent | Query param: `?hostname=xxx`, paginated results |

## **ResourceThresholdViewSet**

**Base URL:** `/api/thresholds/`

| View/Method         | HTTP Method | Purpose                 | Key Features                                  |
| ------------------- | ----------- | ----------------------- | --------------------------------------------- |
| **CRUD Operations** | ALL         | Manage alert thresholds | CPU, memory, disk thresholds with comparisons |

## **NotificationChannelViewSet**

**Base URL:** `/api/notifications/`

| View/Method         | HTTP Method | Purpose                      | Key Features                                  |
| ------------------- | ----------- | ---------------------------- | --------------------------------------------- |
| **CRUD Operations** | ALL         | Manage notification channels | Email, Discord, Slack, Webhook configurations |

## **Custom URL Patterns**

| URL                      | View                       | Purpose                           |
| ------------------------ | -------------------------- | --------------------------------- |
| `/api/csrf/`             | `get_csrf_token`           | Get CSRF token for React frontend |
| `/api/agent/config/`     | `config_by_hostname`       | Agent configuration lookup        |
| `/api/agent/register/`   | Registration `create`      | Agent registration endpoint       |
| `/api/metrics/upload/`   | Metrics `upload_metrics`   | Metrics data ingestion            |
| `/api/processes/upload/` | Process `upload_processes` | Process data ingestion            |
| `/api/processes/list/`   | Process `get_processes`    | Process data retrieval            |

## **Key Data Flow:**

1. **Agent Registration**: `POST /api/agent/register/` → Pending approval
2. **Data Collection**: Agents send to:
   - Logs: `POST /api/logs/upload_logs/`
   - Metrics: `POST /api/metrics/upload/`
   - Processes: `POST /api/processes/upload/`
3. **Frontend Access**: React app reads from:
   - `GET /api/agents/` - Agent list
   - `GET /api/metrics/` - Metrics with filters
   - `GET /api/processes/list/` - Processes with pagination
   - `GET /api/alerts/` - Active alerts

## **Security Features:**

- Agent authentication via hostname
- Encryption support for sensitive data
- Approval workflow for new agents
- CSRF protection for frontend
- Agent status checking before data acceptance

This architecture provides a complete monitoring system with real-time data collection, alerting, and a React-based dashboard interface.
