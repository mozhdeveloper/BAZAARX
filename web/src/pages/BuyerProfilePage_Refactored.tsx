/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useBuyerStore } from "../stores/buyerStore";
import Header from "../components/Header";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { ChevronLeft, Store } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useProfileManager } from "@/hooks/profile/useProfileManager";
import { useAddressManager } from "@/hooks/profile/useAddressManager";
import { usePaymentMethodManager } from "@/hooks/profile/usePaymentMethodManager";
import {
  ProfileInfoSection,
  ProfileSummarySection,
  AddressManagementSection,
  PaymentMethodsSection,
  FollowingSection,
  NotificationSettingsSection,
  AddressModal,
  PaymentMethodModal,
  AvatarUploadModal,
} from "@/components/profile";

export default function BuyerProfilePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile, followedShops } = useBuyerStore();

  const userId = profile?.id || "";
  const { checkSellerStatus } = useProfileManager(userId);
  useAddressManager(userId);
  usePaymentMethodManager(userId);

  const [activeTab, setActiveTab] = useState("personal");
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any>(null);
  const [isSeller, setIsSeller] = useState(false);

  // Check if user is also a seller
  const checkIfSeller = async () => {
    const sellerStatus = await checkSellerStatus({ force: true });
    setIsSeller(sellerStatus);
  };

  if (!profile) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Custom Profile Header - Modern Dark Orange Style */}
      <div className="relative bg-[#2b1203]/70 pt-8 pb-10 overflow-hidden">
        {/* Background Image with Dark Orange Overlay */}
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-center bg-cover opacity-45 scale-110 blur-sm"
            style={{ backgroundImage: `url(${profile.avatar})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#2b1200]/50 via-[#4d2000]/50 to-[#7a3300]/20" />
        </div>

        <div className="max-w-6xl mx-auto px-4 relative z-10">
          <div className="mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="hover:bg-white/10 px-3 -ml-2 text-white/80 hover:text-white transition-all rounded-full backdrop-blur-md bg-white/5"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              Back
            </Button>
          </div>

          <div className="flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8">
            {/* Profile Avatar */}
            <div
              className="relative group cursor-pointer"
              onClick={() => setIsEditModalOpen(true)}
            >
              <div className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-white p-1 shadow-2xl overflow-hidden ring-4 ring-white/10">
                <img
                  src={profile.avatar}
                  alt="Profile"
                  className="w-full h-full rounded-full object-cover transition-transform group-hover:scale-105"
                />
              </div>
              <div className="absolute bottom-1 right-1 bg-white text-[#ff6a00] p-1.5 rounded-full shadow-lg border-2 border-[#ff6a00]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" />
                </svg>
              </div>
            </div>

            {/* Profile Details */}
            <div className="flex-1 text-center md:text-left mt-6 -mb-6">
              <div className="flex flex-col md:flex-row items-center gap-3 mb-2">
                <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                  {profile.firstName} {profile.lastName}
                </h1>
                <Badge className="bg-white text-[#ff6a00] hover:bg-white border-none py-0.5 px-3 flex items-center gap-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm">
                  Verified Member
                </Badge>
              </div>

              <div className="flex flex-col gap-1 mb-5">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-white/80 text-sm font-medium">
                  <span className="flex items-center gap-1.5 bg-black/20 px-3 py-1 rounded-full backdrop-blur-md border border-white/10">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                    </svg>
                    {profile.email}
                  </span>
                  <span className="flex items-center gap-1.5 bg-black/20 px-3 py-1 rounded-full backdrop-blur-md border border-white/10">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    {profile.phone}
                  </span>
                </div>

                {/* Profile Stats - Styled like Seller Storefront */}
                <div className="flex items-center justify-center md:justify-start gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-base font-bold">
                      {profile.totalOrders || 0}
                    </span>
                    <span className="text-white/50 text-[10px] font-bold uppercase tracking-widest">
                      Orders
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-white text-base font-bold">
                        {profile.bazcoins || 0}
                      </span>
                      <span className="text-white/50 text-[10px] font-bold uppercase tracking-widest">
                        Bazcoins
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white text-base font-bold">
                      {followedShops.length}
                    </span>
                    <span className="text-white/50 text-[10px] font-bold uppercase tracking-widest">
                      Following
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={async () => {
                  const sellerStatus = await checkIfSeller();
                  if (sellerStatus) {
                    navigate("/seller");
                  } else {
                    navigate("/seller/auth");
                  }
                }}
                className="bg-[#ff6a00] hover:bg-[#e65e00] text-white font-bold h-10 px-6 rounded-xl shadow-lg shadow-orange-600/20 flex items-center gap-2"
              >
                <Store className="w-4 h-4" />
                {isSeller ? "Switch to Seller Mode" : "Start Selling"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-10 pb-12 relative z-20">
        {/* Content Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="-mt-4 space-y-4"
        >
          <div className="sticky top-20 z-30 flex justify-center w-full mb-4 py-2 backdrop-blur-[2px]">
            <TabsList className="inline-flex h-auto items-center justify-center rounded-full bg-gray-100/80 p-1 shadow-sm">
              <TabsTrigger
                value="personal"
                className="rounded-full px-8 py-1.5 text-sm font-medium text-gray-500 data-[state=active]:bg-white data-[state=active]:text-[#ff6a00] data-[state=active]:shadow-sm transition-all"
              >
                Personal Info
              </TabsTrigger>
              <TabsTrigger
                value="addresses"
                className="rounded-full px-8 py-1.5 text-sm font-medium text-gray-500 data-[state=active]:bg-white data-[state=active]:text-[#ff6a00] data-[state=active]:shadow-sm transition-all"
              >
                Addresses
              </TabsTrigger>
              <TabsTrigger
                value="payments"
                className="rounded-full px-8 py-1.5 text-sm font-medium text-gray-500 data-[state=active]:bg-white data-[state=active]:text-[#ff6a00] data-[state=active]:shadow-sm transition-all"
              >
                Payment Methods
              </TabsTrigger>
              <TabsTrigger
                value="following"
                className="rounded-full px-8 py-1.5 text-sm font-medium text-gray-500 data-[state=active]:bg-white data-[state=active]:text-[#ff6a00] data-[state=active]:shadow-sm transition-all"
              >
                Following
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="rounded-full px-8 py-1.5 text-sm font-medium text-gray-500 data-[state=active]:bg-white data-[state=active]:text-[#ff6a00] data-[state=active]:shadow-sm transition-all"
              >
                Settings
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Personal Content Layout */}
          <TabsContent value="personal">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              <ProfileInfoSection profile={profile} />
              <ProfileSummarySection profile={profile} />
            </motion.div>
          </TabsContent>

          {/* Addresses Content */}
          <TabsContent value="addresses">
            <AddressManagementSection userId={userId} />
          </TabsContent>

          <TabsContent value="following">
            <FollowingSection />
          </TabsContent>

          <TabsContent value="payments">
            <PaymentMethodsSection userId={userId} />
          </TabsContent>

          <TabsContent value="settings">
            <NotificationSettingsSection
              profile={profile}
              onUpdatePreferences={() => undefined}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Address Modal */}
      <AddressModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        address={editingAddress}
        onAddressAdded={async () => true}
        onAddressUpdated={async () => true}
      />

      {/* Payment Method Modal */}
      <PaymentMethodModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
      />

      {/* Edit Profile Modal */}
      <AvatarUploadModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        profile={profile}
        onAvatarUpdated={() => undefined}
      />
    </div>
  );
}
