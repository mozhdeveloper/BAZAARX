import { useState, useEffect } from 'react';
import { User, LogIn, LogOut, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import type { StaffMember } from '@/types/pos.types';

interface StaffLoginProps {
  open: boolean;
  onClose: () => void;
  onLogin: (staff: StaffMember) => void;
  currentStaff?: StaffMember;
}

// Mock staff data - in real app, fetch from Supabase
const MOCK_STAFF: StaffMember[] = [
  {
    id: 'staff_1',
    sellerId: 'seller_1',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+63 912 345 6789',
    role: 'cashier',
    pin: '1234',
    isActive: true,
    canProcessSales: true,
    canProcessReturns: false,
    canApplyDiscounts: false,
    canOpenCashDrawer: true,
    canViewReports: false,
    canManageInventory: false,
    hireDate: '2024-01-15',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'staff_2',
    sellerId: 'seller_1',
    name: 'Jane Smith',
    email: 'jane@example.com',
    phone: '+63 917 654 3210',
    role: 'manager',
    pin: '5678',
    isActive: true,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jane',
    canProcessSales: true,
    canProcessReturns: true,
    canApplyDiscounts: true,
    canOpenCashDrawer: true,
    canViewReports: true,
    canManageInventory: true,
    hireDate: '2023-06-01',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'staff_3',
    sellerId: 'seller_1',
    name: 'Mike Johnson',
    email: 'mike@example.com',
    phone: '+63 905 123 4567',
    role: 'cashier',
    pin: '9999',
    isActive: true,
    canProcessSales: true,
    canProcessReturns: false,
    canApplyDiscounts: false,
    canOpenCashDrawer: false,
    canViewReports: false,
    canManageInventory: false,
    hireDate: '2024-02-01',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function StaffLogin({ open, onClose, onLogin, currentStaff }: StaffLoginProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);

  useEffect(() => {
    if (open) {
      setPin('');
      setError('');
      setSelectedStaff(null);
    }
  }, [open]);

  const handlePinInput = (digit: string) => {
    if (pin.length < 6) {
      const newPin = pin + digit;
      setPin(newPin);
      
      // Auto-submit when PIN is complete (assuming 4-digit PINs)
      if (newPin.length === 4) {
        validatePin(newPin);
      }
    }
  };

  const handlePinDelete = () => {
    setPin(pin.slice(0, -1));
    setError('');
  };

  const validatePin = (pinToValidate: string = pin) => {
    const staff = MOCK_STAFF.find(s => s.pin === pinToValidate && s.isActive);
    
    if (staff) {
      setSelectedStaff(staff);
      setError('');
      setTimeout(() => {
        onLogin(staff);
        onClose();
      }, 800);
    } else {
      setError('Invalid PIN. Please try again.');
      setTimeout(() => {
        setPin('');
        setError('');
      }, 1500);
    }
  };

  const handleStaffSelect = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setPin('');
    setError('');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-[#FF6A00]" />
            Staff Login
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Staff Display */}
          {currentStaff && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center">
                    {currentStaff.avatar ? (
                      <img 
                        src={currentStaff.avatar} 
                        alt={currentStaff.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-5 w-5 text-green-700" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-green-900">{currentStaff.name}</p>
                    <p className="text-xs text-green-700 capitalize">{currentStaff.role}</p>
                  </div>
                </div>
                <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded">Logged In</span>
              </div>
            </div>
          )}

          {/* Staff Selection (Quick Select) */}
          {!selectedStaff && (
            <div className="space-y-2">
              <Label className="text-sm text-gray-700">Select Staff Member:</Label>
              <div className="grid grid-cols-1 gap-2">
                {MOCK_STAFF.filter(s => s.isActive).map((staff) => (
                  <Card
                    key={staff.id}
                    className={`p-3 cursor-pointer hover:border-[#FF6A00] transition-colors ${
                      currentStaff?.id === staff.id ? 'border-green-500 bg-green-50' : ''
                    }`}
                    onClick={() => handleStaffSelect(staff)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        {staff.avatar ? (
                          <img 
                            src={staff.avatar} 
                            alt={staff.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <User className="h-5 w-5 text-gray-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900">{staff.name}</p>
                        <p className="text-xs text-gray-500 capitalize">{staff.role}</p>
                      </div>
                      {currentStaff?.id === staff.id && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                          Current
                        </span>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* PIN Entry */}
          {selectedStaff && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-200 flex items-center justify-center">
                    {selectedStaff.avatar ? (
                      <img 
                        src={selectedStaff.avatar} 
                        alt={selectedStaff.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-6 w-6 text-blue-700" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-blue-900">{selectedStaff.name}</p>
                    <p className="text-sm text-blue-700 capitalize">{selectedStaff.role}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm text-gray-700">Enter PIN:</Label>
                
                {/* PIN Display */}
                <div className="flex justify-center gap-2">
                  {[0, 1, 2, 3].map((index) => (
                    <div
                      key={index}
                      className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center text-2xl font-bold ${
                        pin.length > index
                          ? 'border-[#FF6A00] bg-[#FF6A00]/10 text-[#FF6A00]'
                          : 'border-gray-300 bg-gray-50'
                      }`}
                    >
                      {pin.length > index ? '•' : ''}
                    </div>
                  ))}
                </div>

                {/* Error Message */}
                {error && (
                  <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-2 rounded">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}

                {/* PIN Pad */}
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                    <Button
                      key={digit}
                      variant="outline"
                      className="h-14 text-xl font-semibold hover:bg-[#FF6A00] hover:text-white hover:border-[#FF6A00]"
                      onClick={() => handlePinInput(digit.toString())}
                      disabled={pin.length >= 4}
                    >
                      {digit}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    className="h-14 text-sm hover:bg-gray-100"
                    onClick={() => setSelectedStaff(null)}
                  >
                    Back
                  </Button>
                  <Button
                    variant="outline"
                    className="h-14 text-xl font-semibold hover:bg-[#FF6A00] hover:text-white hover:border-[#FF6A00]"
                    onClick={() => handlePinInput('0')}
                    disabled={pin.length >= 4}
                  >
                    0
                  </Button>
                  <Button
                    variant="outline"
                    className="h-14 text-sm hover:bg-red-50 hover:text-red-600 hover:border-red-600"
                    onClick={handlePinDelete}
                    disabled={pin.length === 0}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Cancel Button */}
          {!selectedStaff && (
            <Button
              variant="outline"
              onClick={onClose}
              className="w-full"
            >
              Cancel
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Staff Badge Component for displaying current staff
export function StaffBadge({ staff, onLogout }: { staff: StaffMember; onLogout: () => void }) {
  return (
    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
        {staff.avatar ? (
          <img 
            src={staff.avatar} 
            alt={staff.name}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <User className="h-4 w-4 text-gray-600" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{staff.name}</p>
        <p className="text-xs text-gray-500 capitalize">{staff.role}</p>
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={onLogout}
        className="h-8 px-2 text-gray-600 hover:text-red-600"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}
