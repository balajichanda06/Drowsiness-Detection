import React from 'react';

interface StatusCardProps {
  title: string;
  status: 'Active' | 'Drowsy' | 'Yawning' | 'Inactive';
}

const StatusCard: React.FC<StatusCardProps> = ({ title, status }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-500';
      case 'Drowsy':
      case 'Yawning':
        return 'bg-red-500 animate-pulse';
      default:
        return 'bg-gray-500';
    }
  };

  const getTextColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'text-green-400';
      case 'Drowsy':
      case 'Yawning':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-300 text-sm font-medium">{title}</span>
        <div className={`w-3 h-3 rounded-full ${getStatusColor(status)}`}></div>
      </div>
      <div className={`text-lg font-semibold ${getTextColor(status)}`}>
        {status}
      </div>
    </div>
  );
};

export default StatusCard;