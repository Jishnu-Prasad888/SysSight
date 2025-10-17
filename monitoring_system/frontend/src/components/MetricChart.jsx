// src/components/MetricChart.jsx
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const MetricChart = ({ metrics, metricKey, color, unit }) => {
    const formatData = (metrics) => {
        return metrics.map(metric => ({
            timestamp: new Date(metric.timestamp).toLocaleTimeString(),
            value: metric[metricKey],
            fullTime: new Date(metric.timestamp).toLocaleString()
        }));
    };

    const formatValue = (value) => {
        if (unit === 'MB') {
            return `${(value / 1024 / 1024).toFixed(2)} MB`;
        }
        return `${value}${unit}`;
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border rounded shadow">
                    <p className="font-semibold">{label}</p>
                    <p className="text-blue-500">
                        Value: {formatValue(payload[0].value)}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={formatData(metrics)}>
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
                />
            </LineChart>
        </ResponsiveContainer>
    );
};

export default MetricChart;