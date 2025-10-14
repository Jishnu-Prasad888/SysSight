import React from 'react';
import { useMonitoring } from '../context/MonitoringContext';

const Alerts = () => {
  const { alerts, resolveAlert, loading } = useMonitoring();

  // Safe data handling
  const safeAlerts = Array.isArray(alerts) ? alerts : [];

  const getAlertColor = (level) => {
    switch (level) {
      case 'critical': return 'bg-red-100 border-red-500 text-red-800';
      case 'high': return 'bg-orange-100 border-orange-500 text-orange-800';
      case 'medium': return 'bg-yellow-100 border-yellow-500 text-yellow-800';
      case 'low': return 'bg-blue-100 border-blue-500 text-blue-800';
      default: return 'bg-gray-100 border-gray-500 text-gray-800';
    }
  };

  const handleResolve = (alertId) => {
    if (window.confirm('Are you sure you want to resolve this alert?')) {
      resolveAlert(alertId);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading alerts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b">
        <h2 className="text-xl font-semibold">Alerts</h2>
        <p className="text-gray-600">System alerts and notifications</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Level
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Agent
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Triggered
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {safeAlerts.map((alert) => (
              <tr key={alert.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getAlertColor(alert.level)}`}>
                    {alert.level}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {alert.title}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {alert.description}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {alert.agent_hostname}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(alert.triggered_at).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${alert.resolved
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                    }`}>
                    {alert.resolved ? 'Resolved' : 'Active'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {!alert.resolved && (
                    <button
                      onClick={() => handleResolve(alert.id)}
                      className="text-green-600 hover:text-green-900 font-medium"
                    >
                      Resolve
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {safeAlerts.length === 0 && (
          <div className="text-center py-12">
            <span className="text-4xl">🎉</span>
            <p className="text-gray-500 mt-2">No alerts found</p>
            <p className="text-sm text-gray-400 mt-1">
              All systems are running smoothly
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Alerts;