import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navigation = () => {
    const location = useLocation();

    const navItems = [
        { path: '/', label: 'Dashboard', icon: '📊' },
        { path: '/agents', label: 'Agents', icon: '🖥️' },
        { path: '/alerts', label: 'Alerts', icon: '🚨' },
        { path: '/logs', label: 'Logs', icon: '📋' },
    ];

    return (
        <nav className="bg-white shadow-lg">
            <div className="container mx-auto px-4">
                <div className="flex justify-between items-center py-4">
                    <div className="flex items-center space-x-2">
                        <span className="text-2xl">🔍</span>
                        <h1 className="text-xl font-bold text-gray-800">SysSight Monitor</h1>
                    </div>

                    <div className="flex space-x-1">
                        {navItems.map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${location.pathname === item.path
                                        ? 'bg-blue-100 text-blue-700 font-semibold'
                                        : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                            >
                                <span>{item.icon}</span>
                                <span>{item.label}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navigation;