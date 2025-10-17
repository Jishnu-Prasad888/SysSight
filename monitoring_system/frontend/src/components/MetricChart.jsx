import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const MetricChart = ({ metrics, metricKey, color, unit, label }) => {
    // Enhanced data formatting with validation
    const formatData = (metrics) => {
        if (!metrics || !Array.isArray(metrics)) {
            return [];
        }

        return metrics
            .filter(metric => metric && metric.timestamp) // Filter out invalid metrics
            .map(metric => ({
                timestamp: new Date(metric.timestamp).toLocaleTimeString(),
                value: metric[metricKey] || 0, // Fallback to 0 if undefined
                name: metric.process_name || 'System',
                fullTime: new Date(metric.timestamp).toLocaleString(),
                originalValue: metric[metricKey] // Keep original for reference
            }))
            .filter(item => item.value !== undefined && item.value !== null); // Remove items with no data
    };

    const formatValue = (value) => {
        if (value === undefined || value === null) return 'N/A';

        if (unit === 'MB') {
            return `${(value / 1024 / 1024).toFixed(2)} MB`;
        }
        return `${value}${unit}`;
    };

    const CustomTooltip = ({ active, payload, label: xLabel }) => {
        if (active && payload && payload.length) {
            const metric = payload[0].payload;
            return (
                <div className="bg-white p-3 border rounded shadow">
                    <p className="font-semibold">{metric.name}</p>
                    <p className="text-blue-500">
                        {label}: {formatValue(metric.originalValue)}
                    </p>
                    <p className="text-gray-400 text-sm">{metric.fullTime}</p>
                </div>
            );
        }
        return null;
    };

    const chartData = formatData(metrics);

    // Show message if no data available for this specific metric
    if (chartData.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 text-gray-500">
                <div className="text-center">
                    <p>No {label.toLowerCase()} data available</p>
                    <p className="text-sm mt-2">Waiting for metrics collection...</p>
                </div>
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                    dataKey="timestamp"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval="preserveStartEnd"
                />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Line
                    type="monotone"
                    dataKey="value"
                    stroke={color}
                    strokeWidth={2}
                    dot={false}
                    connectNulls={true}
                />
            </LineChart>
        </ResponsiveContainer>
    );
};

export default MetricChart;