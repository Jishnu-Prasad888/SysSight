// src/components/AlertItem.jsx - CLEAN VERSION
import React, { useState } from 'react';

const AlertItem = ({ alert, onResolve, onUnresolve, onAddNote, onDelete, isSelected, onSelect, levelColors, showCheckbox = false }) => {
    const [showNotes, setShowNotes] = useState(false);
    const [newNote, setNewNote] = useState('');

    const getLevelColor = (level) => {
        const colors = {
            low: 'bg-green-100 text-green-800 border-green-200',
            medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            high: 'bg-orange-100 text-orange-800 border-orange-200',
            critical: 'bg-red-100 text-red-800 border-red-200'
        };
        return colors[level] || colors.medium;
    };

    const getAlertTypeColor = (type) => {
        const colors = {
            process: 'bg-purple-100 text-purple-800',
            network: 'bg-blue-100 text-blue-800',
            authentication: 'bg-pink-100 text-pink-800',
            resource: 'bg-indigo-100 text-indigo-800',
            security: 'bg-red-100 text-red-800',
            system: 'bg-gray-100 text-gray-800'
        };
        return colors[type] || colors.system;
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return 'N/A';
        try {
            return new Date(timestamp).toLocaleString();
        } catch (error) {
            return 'Invalid Date';
        }
    };

    const handleAddNote = () => {
        if (newNote.trim()) {
            onAddNote(alert.id, newNote.trim());
            setNewNote('');
            setShowNotes(false);
        }
    };

    const renderMetadata = () => {
        if (!alert.metadata || typeof alert.metadata !== 'object') return null;

        return (
            <div className="mt-2 flex flex-wrap gap-2">
                {alert.metadata.process_name && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                        Process: {alert.metadata.process_name}
                    </span>
                )}
                {alert.metadata.source_ip && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                        Source: {alert.metadata.source_ip}
                    </span>
                )}
                {alert.metadata.destination_ip && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                        Dest: {alert.metadata.destination_ip}
                    </span>
                )}
                {alert.metadata.port && (
                    <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">
                        Port: {alert.metadata.port}
                    </span>
                )}
                {alert.metadata.user && (
                    <span className="px-2 py-1 bg-pink-100 text-pink-700 rounded-full text-xs">
                        User: {alert.metadata.user}
                    </span>
                )}
                {alert.metadata.current_value && (
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs">
                        Value: {alert.metadata.current_value}
                    </span>
                )}
            </div>
        );
    };

    return (
        <div className={`border-l-4 rounded-lg p-4 shadow-sm ${alert.resolved
            ? 'bg-gray-50 border-gray-300'
            : getLevelColor(alert.level)
            } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                        {showCheckbox && (
                            <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => onSelect(alert.id, e.target.checked)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                        )}
                        <div className="flex items-center space-x-3 flex-1">
                            <h3 className={`font-semibold ${alert.resolved ? 'text-gray-600' : 'text-gray-900'}`}>
                                {alert.title || 'Untitled Alert'}
                            </h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${alert.resolved ? 'bg-gray-200 text-gray-700' : getLevelColor(alert.level)}`}>
                                {(alert.level || 'medium').toUpperCase()}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAlertTypeColor(alert.alert_type)}`}>
                                {alert.alert_type_display || alert.alert_type || 'system'}
                            </span>
                            {alert.resolved && (
                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                                    RESOLVED
                                </span>
                            )}
                        </div>
                    </div>

                    <p className={`mt-1 ${alert.resolved ? 'text-gray-500' : 'text-gray-700'}`}>
                        {alert.description || 'No description available'}
                    </p>

                    {renderMetadata()}

                    {/* Notes Section */}
                    {alert.notes && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="text-sm font-medium text-gray-700">Notes</h4>
                                <button
                                    onClick={() => setShowNotes(!showNotes)}
                                    className="text-blue-600 hover:text-blue-800 text-sm"
                                >
                                    {showNotes ? 'Hide' : 'Show'} Notes
                                </button>
                            </div>
                            {showNotes && (
                                <div className="text-sm text-gray-600 whitespace-pre-line">
                                    {alert.notes}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mt-2 text-sm text-gray-500">
                        <span>Host: {alert.agent_hostname || 'Unknown'}</span>
                        <span className="mx-2">•</span>
                        <span>Created: {formatTime(alert.triggered_at)}</span>
                        {alert.resolved && alert.resolved_at && (
                            <>
                                <span className="mx-2">•</span>
                                <span>Resolved: {formatTime(alert.resolved_at)}</span>
                            </>
                        )}
                    </div>
                </div>

                <div className="ml-4 flex flex-col space-y-2 min-w-[120px]">
                    {!alert.resolved ? (
                        <button
                            onClick={() => onResolve(alert.id)}
                            className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 whitespace-nowrap"
                        >
                            Mark Resolved
                        </button>
                    ) : (
                        <button
                            onClick={() => onUnresolve(alert.id)}
                            className="bg-yellow-500 text-white px-3 py-1 rounded text-sm hover:bg-yellow-600 whitespace-nowrap"
                        >
                            Mark Unresolved
                        </button>
                    )}

                    <button
                        onClick={() => setShowNotes(!showNotes)}
                        className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 whitespace-nowrap"
                    >
                        Add Note
                    </button>

                    <button
                        onClick={() => onDelete(alert.id)}
                        className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 whitespace-nowrap"
                    >
                        Delete
                    </button>
                </div>
            </div>

            {/* Add Note Form */}
            {showNotes && (
                <div className="mt-4 p-3 bg-white border rounded-lg">
                    <textarea
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Add a note about this alert..."
                        className="w-full p-2 border rounded text-sm"
                        rows="3"
                    />
                    <div className="flex justify-end space-x-2 mt-2">
                        <button
                            onClick={() => setShowNotes(false)}
                            className="px-3 py-1 text-gray-600 border rounded text-sm hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAddNote}
                            disabled={!newNote.trim()}
                            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            Save Note
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AlertItem;