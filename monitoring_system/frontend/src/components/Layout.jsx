// src/components/Layout.jsx
import React, { useState } from 'react';
import { Shield, Activity, Server, Settings, Bell, User, LogOut, ChevronDown, Menu, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const Layout = ({ children, user }) => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const navigation = [
        { id: 'dashboard', name: 'Dashboard', icon: Activity, path: '/dashboard' },
        { id: 'alerts', name: 'Alerts', icon: Bell, path: '/alerts' },
        { id: 'agents', name: 'Agents', icon: Server, path: '/agents' },
        { id: 'metrics', name: 'Metrics', icon: Activity, path: '/metrics' },
        { id: 'processes', name: 'Processes', icon: Server, path: '/processes' },
        { id: 'settings', name: 'Settings', icon: Settings, path: '/settings' },
    ];

    const getActiveTab = () => {
        const currentPath = location.pathname;
        const activeNav = navigation.find(nav => currentPath.startsWith(nav.path));
        return activeNav?.id || 'dashboard';
    };

    const handleNavigation = (path) => {
        navigate(path);
        setMobileMenuOpen(false);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        window.location.href = '/login';
    };

    const activeTab = getActiveTab();

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Sticky Navbar */}
            <nav className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        {/* Left side - Logo and navigation */}
                        <div className="flex items-center">
                            {/* Logo */}
                            <div className="flex items-center">
                                <Shield className="w-8 h-8 text-blue-600" />
                                <span className="ml-2 text-xl font-bold text-gray-900 hidden sm:block">
                                    SysSight
                                </span>
                            </div>

                            {/* Desktop Navigation */}
                            <div className="hidden md:flex md:items-center md:space-x-1 ml-8 pl-37">
                                {navigation.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => handleNavigation(item.path)}
                                            className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${activeTab === item.id
                                                ? 'bg-blue-100 text-blue-700'
                                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                                }`}
                                        >
                                            <Icon className="w-4 h-4 mr-2" />
                                            {item.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Right side - User menu and mobile button */}
                        <div className="flex items-center space-x-4">
                            {/* User menu */}
                            <div className="relative">
                                <button
                                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                                >
                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                        <User className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <div className="hidden sm:block text-left">
                                        <p className="text-sm font-medium text-gray-900">{user?.username || 'Admin'}</p>
                                        <p className="text-xs text-gray-500">Administrator</p>
                                    </div>
                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                </button>

                                {userMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                                        <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200 flex items-center">
                                            <User className="w-4 h-4 mr-2" />
                                            Profile
                                        </button>
                                        <button
                                            onClick={() => handleNavigation('/settings')}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200 flex items-center"
                                        >
                                            <Settings className="w-4 h-4 mr-2" />
                                            Settings
                                        </button>
                                        <div className="border-t border-gray-200 my-1"></div>
                                        <button
                                            onClick={handleLogout}
                                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200 flex items-center"
                                        >
                                            <LogOut className="w-4 h-4 mr-2" />
                                            Sign out
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Mobile menu button */}
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 transition-colors duration-200"
                            >
                                {mobileMenuOpen ? (
                                    <X className="w-6 h-6" />
                                ) : (
                                    <Menu className="w-6 h-6" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Navigation Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden bg-white border-t border-gray-200">
                        <div className="px-2 pt-2 pb-3 space-y-1">
                            {navigation.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => handleNavigation(item.path)}
                                        className={`flex items-center w-full text-left px-3 py-2 text-base font-medium rounded-lg transition-colors duration-200 ${activeTab === item.id
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                            }`}
                                    >
                                        <Icon className="w-5 h-5 mr-3" />
                                        {item.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </nav>

            {/* Main content */}
            <main className="flex-1 overflow-auto">
                <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                    {children}
                </div>
            </main>

            {/* Close user menu when clicking outside */}
            {userMenuOpen && (
                <div
                    className="fixed inset-0 z-30"
                    onClick={() => setUserMenuOpen(false)}
                />
            )}
        </div>
    );
};

export default Layout;