import { useState } from 'react';
import { Building2, MapPin, Check } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { Branch } from '@/types/pos.types';

interface BranchSelectorProps {
  branches: Branch[];
  currentBranch?: Branch;
  onSelect: (branch: Branch) => void;
  className?: string;
}

// Mock branches - in real app, fetch from Supabase
export const MOCK_BRANCHES: Branch[] = [
  {
    id: 'branch_1',
    sellerId: 'seller_1',
    name: 'Main Store - Manila',
    address: '123 Rizal Avenue',
    city: 'Manila',
    province: 'Metro Manila',
    contactNumber: '+63 2 1234 5678',
    email: 'manila@bazaarph.com',
    isActive: true,
    isMainBranch: true,
    openingHours: [
      { day: 'Monday', open: '09:00', close: '21:00' },
      { day: 'Tuesday', open: '09:00', close: '21:00' },
      { day: 'Wednesday', open: '09:00', close: '21:00' },
      { day: 'Thursday', open: '09:00', close: '21:00' },
      { day: 'Friday', open: '09:00', close: '21:00' },
      { day: 'Saturday', open: '10:00', close: '22:00' },
      { day: 'Sunday', open: '10:00', close: '20:00' },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'branch_2',
    sellerId: 'seller_1',
    name: 'Makati Branch',
    address: '456 Ayala Avenue',
    city: 'Makati',
    province: 'Metro Manila',
    contactNumber: '+63 2 9876 5432',
    email: 'makati@bazaarph.com',
    isActive: true,
    isMainBranch: false,
    openingHours: [
      { day: 'Monday', open: ' 10:00', close: '20:00' },
      { day: 'Tuesday', open: '10:00', close: '20:00' },
      { day: 'Wednesday', open: '10:00', close: '20:00' },
      { day: 'Thursday', open: '10:00', close: '20:00' },
      { day: 'Friday', open: '10:00', close: '20:00' },
      { day: 'Saturday', open: '10:00', close: '21:00' },
      { day: 'Sunday', open: '11:00', close: '19:00' },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'branch_3',
    sellerId: 'seller_1',
    name: 'Quezon City Branch',
    address: '789 Commonwealth Avenue',
    city: 'Quezon City',
    province: 'Metro Manila',
    contactNumber: '+63 2 5555 1234',
    email: 'qc@bazaarph.com',
    isActive: true,
    isMainBranch: false,
    openingHours: [
      { day: 'Monday', open: '09:00', close: '21:00' },
      { day: 'Tuesday', open: '09:00', close: '21:00' },
      { day: 'Wednesday', open: '09:00', close: '21:00' },
      { day: 'Thursday', open: '09:00', close: '21:00' },
      { day: 'Friday', open: '09:00', close: '21:00' },
      { day: 'Saturday', open: '10:00', close: '22:00' },
      { day: 'Sunday', open: '10:00', close: '20:00' },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function BranchSelector({ 
  branches, 
  currentBranch, 
  onSelect, 
  className 
}: BranchSelectorProps) {
  const activeBranches = branches.filter(b => b.isActive);

  return (
    <div className={className}>
      <Select 
        value={currentBranch?.id} 
        onValueChange={(id) => {
          const branch = branches.find(b => b.id === id);
          if (branch) onSelect(branch);
        }}
      >
        <SelectTrigger className="w-full hover:border-[#FF6A00] transition-colors">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-[#FF6A00]" />
            <SelectValue placeholder="Select branch..." />
          </div>
        </SelectTrigger>
        <SelectContent>
          {activeBranches.map((branch) => (
            <SelectItem key={branch.id} value={branch.id}>
              <div className="flex items-center gap-2 py-1">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{branch.name}</span>
                    {branch.isMainBranch && (
                      <Badge variant="secondary" className="text-xs">Main</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                    <MapPin className="h-3 w-3" />
                    {branch.city}, {branch.province}
                  </div>
                </div>
                {currentBranch?.id === branch.id && (
                  <Check className="h-4 w-4 text-[#FF6A00]" />
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// Compact Branch Badge
export function BranchBadge({ branch }: { branch?: Branch }) {
  if (!branch) {
    return (
      <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
        <Building2 className="h-4 w-4 text-gray-400" />
        <span className="text-sm text-gray-600">No branch selected</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
      <div className="w-8 h-8 rounded-full bg-[#FF6A00]/10 flex items-center justify-center">
        <Building2 className="h-4 w-4 text-[#FF6A00]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900 truncate">{branch.name}</p>
          {branch.isMainBranch && (
            <Badge variant="secondary" className="text-xs">Main</Badge>
          )}
        </div>
        <p className="text-xs text-gray-500">{branch.city}</p>
      </div>
    </div>
  );
}
