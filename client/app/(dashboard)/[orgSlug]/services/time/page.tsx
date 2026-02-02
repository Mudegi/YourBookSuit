'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Clock, Play, Pause, Square, Calendar, User, Plus, Search, Filter, Timer } from 'lucide-react';

interface TimeEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  projectId?: string;
  projectName?: string;
  serviceId?: string;
  serviceName?: string;
  taskDescription: string;
  startTime: string;
  endTime?: string;
  duration?: number; // in minutes
  status: 'RUNNING' | 'STOPPED' | 'COMPLETED';
  billable: boolean;
  hourlyRate?: number;
  totalAmount?: number;
  notes?: string;
  date: string;
  createdAt: string;
}

export default function ServiceTimeTrackingPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;

  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [activeTimer, setActiveTimer] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');

  useEffect(() => {
    loadTimeEntries();
  }, []);

  const loadTimeEntries = async () => {
    try {
      setLoading(true);
      // This would normally fetch from your API
      // const response = await fetch(`/api/${orgSlug}/services/time`);
      // const data = await response.json();
      
      // Mock data for demonstration
      const mockTimeEntries: TimeEntry[] = [
        {
          id: '1',
          employeeId: '1',
          employeeName: 'John Doe',
          serviceId: '1',
          serviceName: 'IT Support Service',
          taskDescription: 'Network troubleshooting and configuration',
          startTime: '2026-01-09T09:00:00Z',
          endTime: '2026-01-09T12:00:00Z',
          duration: 180,
          status: 'COMPLETED',
          billable: true,
          hourlyRate: 75,
          totalAmount: 225,
          notes: 'Resolved connectivity issues for main office network',
          date: '2026-01-09',
          createdAt: '2026-01-09T09:00:00Z'
        },
        {
          id: '2',
          employeeId: '2',
          employeeName: 'Jane Smith',
          projectId: '1',
          projectName: 'Website Redesign Project',
          taskDescription: 'Frontend development - responsive design implementation',
          startTime: '2026-01-09T13:30:00Z',
          status: 'RUNNING',
          billable: true,
          hourlyRate: 85,
          notes: 'Working on mobile responsiveness',
          date: '2026-01-09',
          createdAt: '2026-01-09T13:30:00Z'
        },
        {
          id: '3',
          employeeId: '3',
          employeeName: 'Mike Johnson',
          serviceId: '2',
          serviceName: 'Business Consulting',
          taskDescription: 'Process optimization analysis',
          startTime: '2026-01-09T10:00:00Z',
          endTime: '2026-01-09T11:30:00Z',
          duration: 90,
          status: 'COMPLETED',
          billable: true,
          hourlyRate: 120,
          totalAmount: 180,
          notes: 'Initial analysis completed, follow-up scheduled',
          date: '2026-01-09',
          createdAt: '2026-01-09T10:00:00Z'
        },
        {
          id: '4',
          employeeId: '1',
          employeeName: 'John Doe',
          taskDescription: 'Internal training session',
          startTime: '2026-01-09T14:00:00Z',
          endTime: '2026-01-09T15:30:00Z',
          duration: 90,
          status: 'COMPLETED',
          billable: false,
          notes: 'Team knowledge sharing session',
          date: '2026-01-09',
          createdAt: '2026-01-09T14:00:00Z'
        }
      ];
      
      setTimeEntries(mockTimeEntries);
      // Find active timer
      const runningEntry = mockTimeEntries.find(entry => entry.status === 'RUNNING');
      if (runningEntry) {
        setActiveTimer(runningEntry.id);
      }
    } catch (error) {
      console.error('Failed to load time entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getCurrentDuration = (startTime: string) => {
    const start = new Date(startTime);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    return formatDuration(diffMins);
  };

  const startTimer = (entryId: string) => {
    setActiveTimer(entryId);
    // Update entry status to RUNNING
    setTimeEntries(prev => prev.map(entry => 
      entry.id === entryId ? { ...entry, status: 'RUNNING' as const } : entry
    ));
  };

  const stopTimer = (entryId: string) => {
    setActiveTimer(null);
    // Update entry status to STOPPED and calculate duration
    setTimeEntries(prev => prev.map(entry => {
      if (entry.id === entryId) {
        const endTime = new Date().toISOString();
        const duration = Math.floor((new Date(endTime).getTime() - new Date(entry.startTime).getTime()) / (1000 * 60));
        const totalAmount = entry.billable && entry.hourlyRate ? (duration / 60) * entry.hourlyRate : undefined;
        return { 
          ...entry, 
          status: 'STOPPED' as const, 
          endTime, 
          duration,
          totalAmount 
        };
      }
      return entry;
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return 'bg-green-100 text-green-700';
      case 'STOPPED':
        return 'bg-yellow-100 text-yellow-700';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return <Play size={16} />;
      case 'STOPPED':
        return <Pause size={16} />;
      case 'COMPLETED':
        return <Square size={16} />;
      default:
        return <Clock size={16} />;
    }
  };

  const filteredEntries = timeEntries.filter(entry => {
    const matchesSearch = 
      entry.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.taskDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entry.serviceName && entry.serviceName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (entry.projectName && entry.projectName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === '' || entry.status === statusFilter;
    const matchesDate = dateFilter === '' || entry.date === dateFilter;
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const totalBillableHours = timeEntries
    .filter(entry => entry.billable && entry.duration)
    .reduce((total, entry) => total + (entry.duration || 0), 0);

  const totalRevenue = timeEntries
    .filter(entry => entry.billable && entry.totalAmount)
    .reduce((total, entry) => total + (entry.totalAmount || 0), 0);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-300 rounded"></div>
            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            <div className="h-4 bg-gray-300 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Time Tracking</h1>
          <p className="text-gray-600">Track time spent on services and projects</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700">
          <Plus size={20} />
          New Time Entry
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Entries</p>
              <p className="text-2xl font-bold text-gray-900">{timeEntries.length}</p>
            </div>
            <Clock className="h-8 w-8 text-gray-400" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Timers</p>
              <p className="text-2xl font-bold text-green-600">{timeEntries.filter(e => e.status === 'RUNNING').length}</p>
            </div>
            <Timer className="h-8 w-8 text-green-400" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Billable Hours</p>
              <p className="text-2xl font-bold text-blue-600">{formatDuration(totalBillableHours)}</p>
            </div>
            <User className="h-8 w-8 text-blue-400" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Revenue</p>
              <p className="text-2xl font-bold text-green-600">${totalRevenue.toFixed(2)}</p>
            </div>
            <Calendar className="h-8 w-8 text-green-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search time entries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Status</option>
            <option value="RUNNING">Running</option>
            <option value="STOPPED">Stopped</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Time Entries List */}
      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Task/Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rate/Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="text-gray-400 mr-2" size={16} />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{entry.employeeName}</div>
                        <div className="text-sm text-gray-500">{entry.date}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{entry.taskDescription}</div>
                      <div className="text-sm text-gray-500">
                        {entry.serviceName && <span>Service: {entry.serviceName}</span>}
                        {entry.projectName && <span>Project: {entry.projectName}</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        Start: {new Date(entry.startTime).toLocaleTimeString()}
                      </div>
                      {entry.endTime && (
                        <div className="text-sm text-gray-500">
                          End: {new Date(entry.endTime).toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {entry.status === 'RUNNING' 
                        ? getCurrentDuration(entry.startTime)
                        : entry.duration 
                          ? formatDuration(entry.duration)
                          : '--'
                      }
                    </div>
                    {entry.billable && (
                      <div className="text-xs text-green-600">Billable</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(entry.status)}`}>
                      {getStatusIcon(entry.status)}
                      {entry.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      {entry.hourlyRate && (
                        <div className="text-sm font-medium text-gray-900">${entry.hourlyRate}/hr</div>
                      )}
                      {entry.totalAmount && (
                        <div className="text-sm text-green-600">${entry.totalAmount.toFixed(2)}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {entry.status === 'RUNNING' ? (
                      <button
                        onClick={() => stopTimer(entry.id)}
                        className="text-red-600 hover:text-red-900 flex items-center gap-1"
                      >
                        <Pause size={16} />
                        Stop
                      </button>
                    ) : entry.status === 'STOPPED' ? (
                      <button
                        onClick={() => startTimer(entry.id)}
                        className="text-green-600 hover:text-green-900 flex items-center gap-1"
                      >
                        <Play size={16} />
                        Resume
                      </button>
                    ) : (
                      <span className="text-gray-400">Completed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredEntries.length === 0 && (
          <div className="text-center py-12">
            <Clock className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No time entries found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter || dateFilter ? 'Try adjusting your search or filters.' : 'Get started by creating a new time entry.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}