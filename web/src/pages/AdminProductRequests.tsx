import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../stores/adminStore';
import AdminSidebar from '../components/AdminSidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  TrendingUp,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  ThumbsUp,
  Eye
} from 'lucide-react';

interface ProductRequest {
  id: string;
  productName: string;
  description: string;
  category: string;
  requestedBy: string;
  requestDate: Date;
  votes: number;
  comments: number;
  status: 'pending' | 'approved' | 'rejected' | 'in_progress';
  priority: 'low' | 'medium' | 'high';
  estimatedDemand: number;
  adminNotes?: string;
}

const AdminProductRequests: React.FC = () => {
  const { isAuthenticated } = useAdminAuth();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'in_progress'>('all');
  const [selectedRequest, setSelectedRequest] = useState<ProductRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  // Mock product requests data
  const [requests, setRequests] = useState<ProductRequest[]>([
    {
      id: 'req-1',
      productName: 'Organic Rice from Ifugao',
      description: 'Looking for authentic organic rice directly from Ifugao rice terraces. Willing to pay premium for quality.',
      category: 'Food & Beverages',
      requestedBy: 'Maria Santos',
      requestDate: new Date('2024-03-10'),
      votes: 245,
      comments: 34,
      status: 'pending',
      priority: 'high',
      estimatedDemand: 1000
    },
    {
      id: 'req-2',
      productName: 'Handmade Pottery from Vigan',
      description: 'Traditional Vigan pottery items - jars, pots, and decorative pieces.',
      category: 'Handicrafts',
      requestedBy: 'Juan Dela Cruz',
      requestDate: new Date('2024-03-08'),
      votes: 189,
      comments: 23,
      status: 'approved',
      priority: 'medium',
      estimatedDemand: 500,
      adminNotes: 'Connected with 3 verified Vigan pottery sellers. Expected listing in 2 weeks.'
    },
    {
      id: 'req-3',
      productName: 'Fresh Mangosteen',
      description: 'Looking for fresh mangosteen during peak season. Bulk orders available.',
      category: 'Fruits',
      requestedBy: 'Carmen Reyes',
      requestDate: new Date('2024-03-05'),
      votes: 156,
      comments: 18,
      status: 'in_progress',
      priority: 'high',
      estimatedDemand: 2000,
      adminNotes: 'Coordinating with Davao fruit sellers. ETA 1 week.'
    },
    {
      id: 'req-4',
      productName: 'Baguio Vegetables Bundle',
      description: 'Mixed vegetables from Baguio - lettuce, carrots, tomatoes, etc.',
      category: 'Vegetables',
      requestedBy: 'Roberto Cruz',
      requestDate: new Date('2024-03-01'),
      votes: 312,
      comments: 45,
      status: 'approved',
      priority: 'high',
      estimatedDemand: 1500,
      adminNotes: 'Multiple Baguio sellers onboarded. Product live on marketplace.'
    },
    {
      id: 'req-5',
      productName: 'Imported Luxury Watches',
      description: 'Looking for authentic Rolex and Omega watches',
      category: 'Accessories',
      requestedBy: 'Suspicious User',
      requestDate: new Date('2024-02-28'),
      votes: 12,
      comments: 3,
      status: 'rejected',
      priority: 'low',
      estimatedDemand: 10,
      adminNotes: 'Request rejected - high risk of counterfeit goods. Does not align with marketplace focus.'
    },
    {
      id: 'req-6',
      productName: 'Mindanao Coffee Beans',
      description: 'Premium coffee beans from Mindanao. Looking for arabica and robusta varieties.',
      category: 'Beverages',
      requestedBy: 'Lisa Chen',
      requestDate: new Date('2024-03-12'),
      votes: 278,
      comments: 56,
      status: 'pending',
      priority: 'high',
      estimatedDemand: 800
    }
  ]);

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  const filteredRequests = requests.filter(request => {
    const matchesSearch =
      request.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.requestedBy.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      filterStatus === 'all' ? true : request.status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  const handleUpdateStatus = (requestId: string, newStatus: 'approved' | 'rejected' | 'in_progress') => {
    setRequests(prev =>
      prev.map(r =>
        r.id === requestId ? { ...r, status: newStatus, adminNotes } : r
      )
    );
    setSelectedRequest(null);
    setAdminNotes('');
  };

  const stats = {
    totalRequests: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    inProgress: requests.filter(r => r.status === 'in_progress').length,
    rejected: requests.filter(r => r.status === 'rejected').length
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'approved': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      case 'in_progress': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-orange-100 text-orange-700';
      case 'low': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar open={open} setOpen={setOpen} />

      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Product Requests Dashboard</h1>
            <p className="text-gray-600">Review and manage customer product requests</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Requests</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalRequests}</p>
                  </div>
                  <MessageSquare className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending</p>
                    <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">In Progress</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">{stats.inProgress}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Approved</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">{stats.approved}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Rejected</p>
                    <p className="text-2xl font-bold text-red-600 mt-1">{stats.rejected}</p>
                  </div>
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Search */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search product requests..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={filterStatus === 'all' ? 'default' : 'outline'}
                    onClick={() => setFilterStatus('all')}
                    className={filterStatus === 'all' ? 'bg-[#FF6A00] hover:bg-[#E55D00]' : ''}
                  >
                    All
                  </Button>
                  <Button
                    variant={filterStatus === 'pending' ? 'default' : 'outline'}
                    onClick={() => setFilterStatus('pending')}
                    className={filterStatus === 'pending' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}
                  >
                    Pending
                  </Button>
                  <Button
                    variant={filterStatus === 'in_progress' ? 'default' : 'outline'}
                    onClick={() => setFilterStatus('in_progress')}
                    className={filterStatus === 'in_progress' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                  >
                    In Progress
                  </Button>
                  <Button
                    variant={filterStatus === 'approved' ? 'default' : 'outline'}
                    onClick={() => setFilterStatus('approved')}
                    className={filterStatus === 'approved' ? 'bg-green-600 hover:bg-green-700' : ''}
                  >
                    Approved
                  </Button>
                  <Button
                    variant={filterStatus === 'rejected' ? 'default' : 'outline'}
                    onClick={() => setFilterStatus('rejected')}
                    className={filterStatus === 'rejected' ? 'bg-red-600 hover:bg-red-700' : ''}
                  >
                    Rejected
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Product Requests List */}
          <div className="grid gap-6">
            {filteredRequests.map((request) => (
              <Card key={request.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Left Section - Request Details */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-gray-900 mb-2">{request.productName}</h3>
                          <p className="text-gray-600 mb-3">{request.description}</p>

                          <div className="flex flex-wrap gap-2 mb-3">
                            <Badge variant="outline">{request.category}</Badge>
                            <Badge className={getPriorityColor(request.priority)}>
                              {request.priority.toUpperCase()} Priority
                            </Badge>
                            <Badge className={getStatusColor(request.status)}>
                              {request.status.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-6 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <ThumbsUp className="h-4 w-4" />
                              <span className="font-medium">{request.votes}</span> votes
                            </div>
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-4 w-4" />
                              <span className="font-medium">{request.comments}</span> comments
                            </div>
                            <div className="flex items-center gap-1">
                              <TrendingUp className="h-4 w-4" />
                              Est. demand: <span className="font-medium">{request.estimatedDemand}</span> units
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="border-t pt-3 mt-3">
                        <div className="flex items-center justify-between text-sm">
                          <div>
                            <span className="text-gray-600">Requested by:</span>
                            <span className="font-medium text-gray-900 ml-2">{request.requestedBy}</span>
                          </div>
                          <div className="text-gray-600">
                            {new Date(request.requestDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                        </div>
                      </div>

                      {request.adminNotes && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm font-medium text-blue-900 mb-1">Admin Notes:</p>
                          <p className="text-sm text-blue-800">{request.adminNotes}</p>
                        </div>
                      )}
                    </div>

                    {/* Right Section - Actions */}
                    <div className="lg:w-64 flex flex-col gap-2">
                      {request.status === 'pending' && (
                        <>
                          <Button
                            onClick={() => setSelectedRequest(request)}
                            className="w-full bg-blue-600 hover:bg-blue-700"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Review Request
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedRequest(request);
                              setAdminNotes('');
                            }}
                            className="w-full"
                          >
                            View Details
                          </Button>
                        </>
                      )}
                      {request.status === 'approved' && (
                        <Button
                          variant="outline"
                          className="w-full text-green-600 border-green-600"
                          disabled
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approved
                        </Button>
                      )}
                      {request.status === 'rejected' && (
                        <Button
                          variant="outline"
                          className="w-full text-red-600 border-red-600"
                          disabled
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Rejected
                        </Button>
                      )}
                      {request.status === 'in_progress' && (
                        <Button
                          variant="outline"
                          className="w-full text-blue-600 border-blue-600"
                        >
                          <TrendingUp className="h-4 w-4 mr-2" />
                          In Progress
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredRequests.length === 0 && (
              <Card>
                <CardContent className="pt-12 pb-12 text-center">
                  <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg">No product requests found</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Review Product Request</h2>

              <div className="space-y-4 mb-6">
                <div>
                  <h3 className="font-semibold text-lg text-gray-900">{selectedRequest.productName}</h3>
                  <p className="text-gray-600 mt-1">{selectedRequest.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Category</p>
                    <p className="font-medium text-gray-900">{selectedRequest.category}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Priority</p>
                    <Badge className={getPriorityColor(selectedRequest.priority)}>
                      {selectedRequest.priority.toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Votes</p>
                    <p className="font-medium text-gray-900">{selectedRequest.votes}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Est. Demand</p>
                    <p className="font-medium text-gray-900">{selectedRequest.estimatedDemand} units</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Admin Notes
                  </label>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add notes about this request..."
                    rows={4}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => handleUpdateStatus(selectedRequest.id, 'approved')}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={() => handleUpdateStatus(selectedRequest.id, 'in_progress')}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  In Progress
                </Button>
                <Button
                  onClick={() => handleUpdateStatus(selectedRequest.id, 'rejected')}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={() => {
                    setSelectedRequest(null);
                    setAdminNotes('');
                  }}
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminProductRequests;
