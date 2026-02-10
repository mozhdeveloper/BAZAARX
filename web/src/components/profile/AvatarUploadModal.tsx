import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Camera, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { BuyerProfile } from '@/stores/buyerStore';
import { supabase } from '@/lib/supabase';

interface AvatarUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: BuyerProfile;
  onAvatarUpdated: (avatarUrl: string) => void;
}

export const AvatarUploadModal = ({
  isOpen,
  onClose,
  profile,
  onAvatarUpdated
}: AvatarUploadModalProps) => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setIsUploading(true);

    try {
      // Upload to Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar_${profile.id}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get Public URL
      const { data } = supabase.storage
        .from('profile-avatars')
        .getPublicUrl(filePath);

      const publicUrl = data.publicUrl;

      // Update avatar URL
      onAvatarUpdated(publicUrl);

      toast({
        title: "Avatar Updated",
        description: "Your profile picture has been updated successfully.",
      });

      onClose();
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Upload Failed",
        description: "Could not upload image.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Change Profile Photo</DialogTitle>
          <DialogDescription>
            Upload a new profile picture to personalize your account.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-6">
          <div 
            className="relative group cursor-pointer"
            onClick={() => document.getElementById('avatar-upload-input')?.click()}
          >
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-200">
              <img
                src={profile.avatar}
                alt="Current Avatar"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
              <Camera className="w-10 h-10 text-white" />
            </div>
            <input
              id="avatar-upload-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
              disabled={isUploading}
            />
          </div>

          <div className="text-center">
            <Label 
              htmlFor="avatar-upload-input"
              className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-[#ff6a00] hover:bg-[#e65e00] text-white rounded-lg font-medium transition-colors"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4" />
                  Choose Photo
                </>
              )}
            </Label>
            <p className="text-sm text-gray-500 mt-2">
              JPG, PNG, or GIF. Max 5MB.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isUploading}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};