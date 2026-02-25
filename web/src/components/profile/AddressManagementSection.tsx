import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit2, Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Address } from "@/stores/buyerStore";
import { useAddressManager } from "@/hooks/profile/useAddressManager";
import { AddressModal } from "./AddressModal";

interface AddressManagementSectionProps {
  userId: string;
}

export const AddressManagementSection = ({
  userId,
}: AddressManagementSectionProps) => {
  const {
    addresses,
    loading,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
  } = useAddressManager(userId);
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | undefined>(
    undefined,
  );

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

    const result = await deleteAddress(addressId);
    if (result) {
      toast({
        title: "Address deleted",
        description: "The address has been removed from your profile.",
      });
    } else {
      toast({
        title: "Error deleting address",
        description: "Could not delete the address. Please try again.",
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
        <Card key={address.id} className="relative group border-gray-100 shadow-sm hover:shadow-md transition-all rounded-xl overflow-hidden">
          <CardContent className="p-6 h-full flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-[var(--brand-primary)] text-lg uppercase tracking-tight">
                    {address.label}
                  </h3>
                  {address.isDefault && (
                    <Badge className="bg-[var(--brand-accent-light)] text-[var(--brand-primary-dark)] border-none text-[10px] font-extrabold tracking-wider">
                      DEFAULT
                    </Badge>
                  )}
                </div>

                <div className="text-sm space-y-1.5 text-gray-600">
                  <p className="font-bold text-[var(--text-headline)]">
                    {address.firstName} {address.lastName}
                  </p>
                  <p className="font-medium text-[var(--text-muted)] flex items-center gap-2">
                    {address.phone}
                  </p>
                  <p className="text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                    {address.street}, {address.barangay}, {address.city},{" "}
                    {address.province} {address.postalCode}
                  </p>
                </div>
              </div>

              <div className="flex gap-1 -mr-2 -mt-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleOpenModal(address)}
                  className="text-gray-400 hover:text-[var(--brand-primary)] p-0 w-8 h-8 hover:bg-[var(--brand-accent-light)]/30 rounded-full transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteAddress(address.id)}
                  className="text-gray-400 hover:text-red-500 p-0 w-8 h-8 hover:bg-red-50 rounded-full transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {!address.isDefault && (
              <div className="flex justify-end mt-4 pt-2 border-t border-gray-50">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDefaultAddress(address.id)}
                  className="text-gray-400 hover:text-[var(--brand-primary)] p-0 h-auto text-[10px] font-bold uppercase tracking-wider hover:bg-transparent transition-all"
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
        className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-200 rounded-xl hover:border-[var(--brand-primary)] hover:bg-[var(--brand-accent-light)]/20 transition-all min-h-[160px] group"
      >
        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3 group-hover:bg-[var(--brand-accent-light)]/50 transition-colors">
          <Plus className="w-6 h-6 text-gray-400 group-hover:text-[var(--brand-primary)]" />
        </div>
        <span className="font-bold text-gray-500 group-hover:text-[var(--brand-primary)] uppercase text-xs tracking-widest transition-colors">Add New Address</span>
      </button>

      <AddressModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        address={editingAddress}
        onAddressAdded={addAddress}
        onAddressUpdated={updateAddress}
      />
    </div>
  );
};
