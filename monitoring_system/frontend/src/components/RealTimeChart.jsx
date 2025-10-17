// src/components/RealTimeChart.js
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const RealTimeChart = ({ metrics }) => {
    const formatData = (metrics) => {
        return metrics.slice(-20).map(metric => ({
            time: new Date(metric.timestamp).toLocaleTimeString(),
            cpu: metric.cpu_usage,
            memory: metric.memory_usage,
            disk: metric.disk_usage,
        }));
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border rounded shadow">
                    <p className="font-semibold">{label}</p>
                    {payload.map((entry, index) => (
                        <p key={index} style={{ color: entry.color }}>
                            {entry.dataKey}: {entry.value}%
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    if (metrics.length === 0) {
        return (
            <div className="h-64 flex items-center justify-center text-gray-500">
                No metrics data available
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={formatData(metrics)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                    dataKey="time"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval="preserveStartEnd"
                />
                <YAxis domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                    type="monotone"
                    dataKey="cpu"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={false}
                    name="CPU"
                />
                <Line
                    type="monotone"
                    dataKey="memory"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={false}
                    name="Memory"
                />
                <Line
                    type="monotone"
                    dataKey="disk"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    dot={false}
                    name="Disk"
                />
            </LineChart>
        </ResponsiveContainer>
    );
};

export default RealTimeChart;