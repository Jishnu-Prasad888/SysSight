// src/components/Settings.js
import React, { useState, useEffect } from 'react';
import { getThresholds, createThreshold, updateThreshold, deleteThreshold, getNotificationChannels, createNotificationChannel, updateNotificationChannel, deleteNotificationChannel } from '../services/api';
import { initializeCSRF } from "../services/api";

const Settings = () => {
    const [activeTab, setActiveTab] = useState('thresholds');
    const [thresholds, setThresholds] = useState([]);
    const [notificationChannels, setNotificationChannels] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        initializeCSRF();
    }, []);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [thresholdsData, channelsData] = await Promise.all([
                getThresholds(),
                getNotificationChannels()
            ]);
            setThresholds(thresholdsData);
            setNotificationChannels(channelsData);
        } catch (error) {
            console.error('Failed to load settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { id: 'thresholds', label: 'Resource Thresholds', icon: '📊' },
        { id: 'notifications', label: 'Notification Channels', icon: '🔔' },
    ];

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Settings</h1>

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
                <nav className="flex space-x-8">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            <span className="mr-2">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            {loading ? (
                <div className="text-center py-8">Loading settings...</div>
            ) : activeTab === 'thresholds' ? (
                <ThresholdSettings
                    thresholds={thresholds}
                    onThresholdsChange={loadData}
                />
            ) : (
                <NotificationSettings
                    channels={notificationChannels}
                    onChannelsChange={loadData}
                />
            )}
        </div>
    );
};

// Threshold Settings Component
const ThresholdSettings = ({ thresholds, onThresholdsChange }) => {
    const [showForm, setShowForm] = useState(false);
    const [editingThreshold, setEditingThreshold] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        resource_type: 'cpu',
        threshold_value: 80,
        comparison: '>',
        process_name: '',
        duration: 60,
        is_active: true
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingThreshold) {
                await updateThreshold(editingThreshold.id, formData);
            } else {
                await createThreshold(formData);
            }
            setShowForm(false);
            setEditingThreshold(null);
            setFormData({
                name: '',
                resource_type: 'cpu',
                threshold_value: 80,
                comparison: '>',
                process_name: '',
                duration: 60,
                is_active: true
            });
            onThresholdsChange();
        } catch (error) {
            console.error('Failed to save threshold:', error);
        }
    };

    const handleEdit = (threshold) => {
        setEditingThreshold(threshold);
        setFormData(threshold);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this threshold?')) {
            try {
                await deleteThreshold(id);
                onThresholdsChange();
            } catch (error) {
                console.error('Failed to delete threshold:', error);
            }
        }
    };

    const resourceTypes = [
        { value: 'cpu', label: 'CPU Usage' },
        { value: 'memory', label: 'Memory Usage' },
        { value: 'disk', label: 'Disk Usage' },
        { value: 'network', label: 'Network Usage' },
        { value: 'process', label: 'Process Specific' },
    ];

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Resource Thresholds</h2>
                <button
                    onClick={() => setShowForm(true)}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                >
                    Add Threshold
                </button>
            </div>

            {showForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4">
                            {editingThreshold ? 'Edit Threshold' : 'Add New Threshold'}
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Resource Type</label>
                                <select
                                    value={formData.resource_type}
                                    onChange={(e) => setFormData({ ...formData, resource_type: e.target.value })}
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                >
                                    {resourceTypes.map(type => (
                                        <option key={type.value} value={type.value}>
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Threshold Value ({formData.resource_type === 'process' ? 'CPU %' : '%'})
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={formData.threshold_value}
                                    onChange={(e) => setFormData({ ...formData, threshold_value: parseFloat(e.target.value) })}
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Comparison</label>
                                <select
                                    value={formData.comparison}
                                    onChange={(e) => setFormData({ ...formData, comparison: e.target.value })}
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                >
                                    <option value=">">Greater Than</option>
                                    <option value="<">Less Than</option>
                                    <option value="=">Equal To</option>
                                </select>
                            </div>

                            {formData.resource_type === 'process' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Process Name</label>
                                    <input
                                        type="text"
                                        value={formData.process_name}
                                        onChange={(e) => setFormData({ ...formData, process_name: e.target.value })}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                        placeholder="e.g., chrome, node"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Duration (seconds)</label>
                                <input
                                    type="number"
                                    value={formData.duration}
                                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                    required
                                />
                            </div>

                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="rounded"
                                />
                                <label className="ml-2 text-sm text-gray-700">Active</label>
                            </div>

                            <div className="flex justify-end space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowForm(false);
                                        setEditingThreshold(null);
                                    }}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                                >
                                    {editingThreshold ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="bg-white shadow rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Threshold</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Process</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {thresholds.map(threshold => (
                            <tr key={threshold.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {threshold.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {threshold.resource_type}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {threshold.comparison} {threshold.threshold_value}%
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {threshold.process_name || '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 text-xs rounded-full ${threshold.is_active
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-gray-100 text-gray-800'
                                        }`}>
                                        {threshold.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                    <button
                                        onClick={() => handleEdit(threshold)}
                                        className="text-blue-600 hover:text-blue-900"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(threshold.id)}
                                        className="text-red-600 hover:text-red-900"
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {thresholds.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                        No thresholds configured
                    </div>
                )}
            </div>
        </div>
    );
};

// Notification Settings Component
const NotificationSettings = ({ channels, onChannelsChange }) => {
    const [showForm, setShowForm] = useState(false);
    const [editingChannel, setEditingChannel] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        channel_type: 'email',
        config: {},
        is_active: true
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingChannel) {
                await updateNotificationChannel(editingChannel.id, formData);
            } else {
                await createNotificationChannel(formData);
            }
            setShowForm(false);
            setEditingChannel(null);
            setFormData({
                name: '',
                channel_type: 'email',
                config: {},
                is_active: true
            });
            onChannelsChange();
        } catch (error) {
            console.error('Failed to save channel:', error);
        }
    };

    const handleEdit = (channel) => {
        setEditingChannel(channel);
        setFormData(channel);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this notification channel?')) {
            try {
                await deleteNotificationChannel(id);
                onChannelsChange();
            } catch (error) {
                console.error('Failed to delete channel:', error);
            }
        }
    };

    const renderConfigFields = () => {
        switch (formData.channel_type) {
            case 'email':
                return (
                    <>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">SMTP Server</label>
                            <input
                                type="text"
                                value={formData.config.smtp_server || ''}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    config: { ...formData.config, smtp_server: e.target.value }
                                })}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                placeholder="smtp.gmail.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Port</label>
                            <input
                                type="number"
                                value={formData.config.port || ''}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    config: { ...formData.config, port: parseInt(e.target.value) }
                                })}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                placeholder="587"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email</label>
                            <input
                                type="email"
                                value={formData.config.email || ''}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    config: { ...formData.config, email: e.target.value }
                                })}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                placeholder="user@example.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Password</label>
                            <input
                                type="password"
                                value={formData.config.password || ''}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    config: { ...formData.config, password: e.target.value }
                                })}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                placeholder="Your email password or app password"
                            />
                        </div>
                    </>
                );

            case 'discord':
                return (
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Webhook URL</label>
                        <input
                            type="url"
                            value={formData.config.webhook_url || ''}
                            onChange={(e) => setFormData({
                                ...formData,
                                config: { ...formData.config, webhook_url: e.target.value }
                            })}
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                            placeholder="https://discord.com/api/webhooks/..."
                        />
                    </div>
                );

            case 'webhook':
                return (
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Webhook URL</label>
                        <input
                            type="url"
                            value={formData.config.webhook_url || ''}
                            onChange={(e) => setFormData({
                                ...formData,
                                config: { ...formData.config, webhook_url: e.target.value }
                            })}
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                            placeholder="https://your-webhook-url.com"
                        />
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Notification Channels</h2>
                <button
                    onClick={() => setShowForm(true)}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                >
                    Add Channel
                </button>
            </div>

            {showForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4">
                            {editingChannel ? 'Edit Channel' : 'Add New Channel'}
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Channel Type</label>
                                <select
                                    value={formData.channel_type}
                                    onChange={(e) => setFormData({ ...formData, channel_type: e.target.value })}
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                >
                                    <option value="email">Email</option>
                                    <option value="discord">Discord</option>
                                    <option value="webhook">Webhook</option>
                                </select>
                            </div>

                            {renderConfigFields()}

                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="rounded"
                                />
                                <label className="ml-2 text-sm text-gray-700">Active</label>
                            </div>

                            <div className="flex justify-end space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowForm(false);
                                        setEditingChannel(null);
                                    }}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                                >
                                    {editingChannel ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="bg-white shadow rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {channels.map(channel => (
                            <tr key={channel.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {channel.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                                    {channel.channel_type}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 text-xs rounded-full ${channel.is_active
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-gray-100 text-gray-800'
                                        }`}>
                                        {channel.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                    <button
                                        onClick={() => handleEdit(channel)}
                                        className="text-blue-600 hover:text-blue-900"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(channel.id)}
                                        className="text-red-600 hover:text-red-900"
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {channels.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                        No notification channels configured
                    </div>
                )}
            </div>
        </div>
    );
};

export default Settings;