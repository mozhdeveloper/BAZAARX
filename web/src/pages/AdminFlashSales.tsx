import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../stores/adminStore';
import { adminFlashSaleService } from '../services/adminFlashSaleService';
import AdminSidebar from '../components/AdminSidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Plus,
  Zap,
  Calendar,
  Edit,
  Trash2,
  Play,
  Pause,
  Clock,
  X,
  Check,
} from 'lucide-react';

const AdminFlashSales: React.FC = () => {
  const { isAuthenticated } = useAdminAuth();
  const [open, setOpen] = useState(false);
  const [slots, setSlots] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSlotName, setNewSlotName] = useState('');
  const [newSlotStartDate, setNewSlotStartDate] = useState('');
  const [newSlotEndDate, setNewSlotEndDate] = useState('');

  const loadSlots = async () => {
    const data = await adminFlashSaleService.getGlobalFlashSaleSlots();
    setSlots(data || []);
  };

  useEffect(() => {
    loadSlots();
  }, []);

  const handleCreateSlot = async () => {
    await adminFlashSaleService.createGlobalFlashSaleSlot(
      newSlotName,
      newSlotStartDate,
      newSlotEndDate
    );
    setShowCreateModal(false);
    loadSlots();
  };

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar open={open} setOpen={setOpen} />

      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Global Flash Sale Slots</h1>
              <p className="text-gray-600">Create and manage global flash sale event slots for sellers to join.</p>
            </div>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-[#FF6A00] hover:bg-[#E55D00]"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Slot
            </Button>
          </div>

          {/* Slot list */}
          <div className="grid gap-6">
            {slots.map((slot) => (
              <Card key={slot.id}>
                <CardContent className="pt-6">
                  <h3 className="text-xl font-semibold">{slot.name}</h3>
                  <p>Starts: {new Date(slot.start_date).toLocaleString()}</p>
                  <p>Ends: {new Date(slot.end_date).toLocaleString()}</p>
                  {/* Button to view submissions would go here */}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Create Slot Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full"
          >
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Global Flash Sale Slot</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="slotName">Slot Name</Label>
                  <Input
                    id="slotName"
                    value={newSlotName}
                    onChange={(e) => setNewSlotName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="datetime-local"
                      value={newSlotStartDate}
                      onChange={(e) => setNewSlotStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="datetime-local"
                      value={newSlotEndDate}
                      onChange={(e) => setNewSlotEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button onClick={handleCreateSlot} className="flex-1 bg-[#FF6A00] hover:bg-[#E55D00]">
                  Create Slot
                </Button>
                <Button onClick={() => setShowCreateModal(false)} variant="outline">
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

export default AdminFlashSales;
