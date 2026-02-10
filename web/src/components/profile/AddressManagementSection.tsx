import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit2, Trash2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Address } from '@/stores/buyerStore';
import { AddressModal } from './AddressModal';

interface AddressManagementSectionProps {
  addresses: Address[];
  userId: string;
  loading: boolean;
  onAddressAdded: (address: Address) => void;
  onAddressUpdated: (id: string, address: Partial<Address>) => void;
  onAddressDeleted: (id: string) => void;
  onSetDefault: (id: string) => void;
}

export const AddressManagementSection = ({
  addresses,
  userId,
  loading,
  onAddressAdded,
  onAddressUpdated,
  onAddressDeleted,
  onSetDefault
}: AddressManagementSectionProps) => {
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | undefined>(undefined);

  const handleOpenModal = (address?: Address) => {
    setEditingAddress(address);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingAddress(undefined);
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm("Are you sure you want to delete this address?")) return;
    
    try {
      onAddressDeleted(addressId);
      toast({
        title: "Address deleted",
        description: "The address has been removed from your profile.",
      });
    } catch (error) {
      toast({
        title: "Error deleting address",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div>Loading addresses...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {addresses.map((address) => (
        <Card key={address.id} className="relative group border-gray-100">
          <CardContent className="p-6 h-full flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-[#ff6a00] text-lg">{address.label}</h3>
                  {address.isDefault && (
                    <Badge className="bg-orange-50 text-[#ff6a00] border-none text-[10px] font-bold">DEFAULT</Badge>
                  )}
                </div>

                <div className="text-sm space-y-1 text-gray-600">
                  <p className="font-bold text-gray-900">{address.firstName} {address.lastName}</p>
                  <p className="font-medium text-gray-500">{address.phone}</p>
                  <p className="text-gray-500 line-clamp-2">
                    {address.street}, {address.barangay}, {address.city}, {address.province} {address.postalCode}
                  </p>
                </div>
              </div>

              <div className="flex gap-1 -mr-2 -mt-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleOpenModal(address)}
                  className="text-gray-400 hover:text-gray-900 p-0 w-8 h-8 hover:bg-transparent transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteAddress(address.id)}
                  className="text-gray-400 hover:text-red-500 p-0 w-8 h-8 hover:bg-transparent transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {!address.isDefault && (
              <div className="flex justify-end mt-4 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSetDefault(address.id)}
                  className="text-gray-400 hover:text-[#ff6a00] p-0 h-auto text-[10px] font-bold uppercase tracking-wider hover:bg-transparent transition-colors"
                >
                  Set as default
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Add New Button */}
      <button
        onClick={() => handleOpenModal()}
        className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-200 rounded-xl hover:border-orange-300 hover:bg-orange-50 transition-all min-h-[160px]"
      >
        <Plus className="w-8 h-8 text-gray-400 mb-2" />
        <span className="font-semibold text-gray-600">Add New Address</span>
      </button>

      <AddressModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        userId={userId}
        address={editingAddress}
        onAddressAdded={onAddressAdded}
        onAddressUpdated={onAddressUpdated}
      />
    </div>
  );
};
