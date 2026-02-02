'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Package, Truck, CheckCircle, Clock, MapPin, User, Plus, Search, Filter } from 'lucide-react';

interface ServiceDelivery {
  id: string;
  deliveryNumber: string;
  bookingId: string;
  customerId: string;
  customerName: string;
  serviceName: string;
  scheduledDate: string;
  deliveredDate?: string;
  deliveryAddress: string;
  status: 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED';
  assignedTo: string;
  items: Array<{
    name: string;
    quantity: number;
    unit: string;
  }>;
  notes?: string;
  deliveryProof?: string;
  createdAt: string;
}

export default function ServiceDeliveriesPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;

  const [deliveries, setDeliveries] = useState<ServiceDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    loadDeliveries();
  }, []);

  const loadDeliveries = async () => {
    try {
      setLoading(true);
      // This would normally fetch from your API
      // const response = await fetch(`/api/${orgSlug}/services/deliveries`);
      // const data = await response.json();
      
      // Mock data for demonstration
      const mockDeliveries: ServiceDelivery[] = [
        {
          id: '1',
          deliveryNumber: 'DEL-001',
          bookingId: 'BK-001',
          customerId: '1',
          customerName: 'TechCorp Ltd',
          serviceName: 'Hardware Installation Service',
          scheduledDate: '2026-01-10',
          deliveredDate: '2026-01-10',
          deliveryAddress: '456 Business Ave, Suite 200, Tech District',
          status: 'DELIVERED',
          assignedTo: 'Delivery Team A',
          items: [
            { name: 'Network Switch', quantity: 2, unit: 'units' },
            { name: 'Ethernet Cables', quantity: 10, unit: 'pieces' },
            { name: 'Installation Kit', quantity: 1, unit: 'set' }
          ],
          notes: 'All equipment delivered and installed successfully',
          deliveryProof: 'Signed receipt on file',
          createdAt: '2026-01-09T08:00:00Z'
        },
        {
          id: '2',
          deliveryNumber: 'DEL-002',
          bookingId: 'BK-002',
          customerId: '2',
          customerName: 'Green Solutions Inc',
          serviceName: 'Equipment Delivery Service',
          scheduledDate: '2026-01-11',
          deliveryAddress: '789 Industrial Park, Building C',
          status: 'IN_TRANSIT',
          assignedTo: 'Delivery Team B',
          items: [
            { name: 'Solar Panel Kit', quantity: 5, unit: 'kits' },
            { name: 'Mounting Hardware', quantity: 1, unit: 'set' }
          ],
          notes: 'Special handling required for fragile items',
          createdAt: '2026-01-09T10:15:00Z'
        },
        {
          id: '3',
          deliveryNumber: 'DEL-003',
          bookingId: 'BK-003',
          customerId: '3',
          customerName: 'Local Restaurant',
          serviceName: 'Kitchen Equipment Service',
          scheduledDate: '2026-01-12',
          deliveryAddress: '321 Food Street, Restaurant Row',
          status: 'PENDING',
          assignedTo: 'Specialist Team',
          items: [
            { name: 'Industrial Mixer', quantity: 1, unit: 'unit' },
            { name: 'Replacement Parts', quantity: 15, unit: 'pieces' }
          ],
          notes: 'Coordinate with restaurant manager for delivery time',
          createdAt: '2026-01-09T12:30:00Z'
        }
      ];
      
      setDeliveries(mockDeliveries);
    } catch (error) {
      console.error('Failed to load deliveries:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-gray-100 text-gray-700';
      case 'IN_TRANSIT':
        return 'bg-blue-100 text-blue-700';
      case 'DELIVERED':
        return 'bg-green-100 text-green-700';
      case 'FAILED':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock size={16} />;
      case 'IN_TRANSIT':
        return <Truck size={16} />;
      case 'DELIVERED':
        return <CheckCircle size={16} />;
      case 'FAILED':
        return <Package size={16} />;
      default:
        return <Clock size={16} />;
    }
  };

  const filteredDeliveries = deliveries.filter(delivery => {
    const matchesSearch = 
      delivery.deliveryNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.serviceName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === '' || delivery.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

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
          <h1 className="text-2xl font-bold text-gray-900">Service Deliveries</h1>
          <p className="text-gray-600">Track service delivery progress and completion</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700">
          <Plus size={20} />
          New Delivery
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{deliveries.filter(d => d.status === 'PENDING').length}</p>
            </div>
            <Clock className="h-8 w-8 text-gray-400" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">In Transit</p>
              <p className="text-2xl font-bold text-blue-600">{deliveries.filter(d => d.status === 'IN_TRANSIT').length}</p>
            </div>
            <Truck className="h-8 w-8 text-blue-400" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Delivered</p>
              <p className="text-2xl font-bold text-green-600">{deliveries.filter(d => d.status === 'DELIVERED').length}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Failed</p>
              <p className="text-2xl font-bold text-red-600">{deliveries.filter(d => d.status === 'FAILED').length}</p>
            </div>
            <Package className="h-8 w-8 text-red-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search deliveries..."
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
            <option value="PENDING">Pending</option>
            <option value="IN_TRANSIT">In Transit</option>
            <option value="DELIVERED">Delivered</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
      </div>

      {/* Deliveries List */}
      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Delivery
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Service
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Schedule
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned To
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDeliveries.map((delivery) => (
                <tr key={delivery.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{delivery.deliveryNumber}</div>
                      <div className="text-sm text-gray-500">Booking: {delivery.bookingId}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="text-gray-400 mr-2" size={16} />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{delivery.customerName}</div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <MapPin size={12} className="mr-1" />
                          <span className="truncate max-w-32" title={delivery.deliveryAddress}>
                            {delivery.deliveryAddress}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{delivery.serviceName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">Scheduled: {delivery.scheduledDate}</div>
                      {delivery.deliveredDate && (
                        <div className="text-sm text-gray-500">Delivered: {delivery.deliveredDate}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {delivery.items.slice(0, 2).map((item, idx) => (
                        <div key={idx}>{item.quantity} {item.unit} {item.name}</div>
                      ))}
                      {delivery.items.length > 2 && (
                        <div className="text-gray-500">+{delivery.items.length - 2} more items</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(delivery.status)}`}>
                      {getStatusIcon(delivery.status)}
                      {delivery.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {delivery.assignedTo}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredDeliveries.length === 0 && (
          <div className="text-center py-12">
            <Truck className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No deliveries found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter ? 'Try adjusting your search or filters.' : 'Get started by scheduling a new delivery.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}