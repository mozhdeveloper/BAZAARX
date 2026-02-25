import {
  ProfileInfoSection,
  ProfileSummarySection,
  AddressManagementSection,
  PaymentMethodsSection,
  FollowingSection,
  NotificationSettingsSection,
} from "@/components/profile";
import Header from "../components/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import type { BuyerProfile } from "@/stores/buyerStore";

export default function ProfileComponentsTest() {
  // Mock data for testing
  const mockProfile: BuyerProfile = {
    id: "test-user-123",
    email: "test@example.com",
    firstName: "John",
    lastName: "Doe",
    phone: "+639123456789",
    avatar: "https://via.placeholder.com/150",
    memberSince: new Date("2023-01-15"),
    totalOrders: 25,
    totalSpent: 15000,
    bazcoins: 1250,
    preferences: {
      language: "en",
      currency: "PHP",
      notifications: {
        email: true,
        sms: false,
        push: true,
      },
      privacy: {
        showProfile: true,
        showPurchases: false,
        showFollowing: true,
      },
    },
    paymentMethods: [],
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Custom Profile Header - Modern Dark Orange Style */}
      <div className="relative bg-[#2b1203]/70 pt-8 pb-10 overflow-hidden">
        {/* Background Image with Dark Orange Overlay */}
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-center bg-cover opacity-45 scale-110 blur-sm"
            style={{ backgroundImage: `url(${mockProfile.avatar})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#2b1200]/50 via-[#4d2000]/50 to-[#7a3300]/20" />
        </div>

        <div className="max-w-6xl mx-auto px-4 relative z-10">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8">
            {/* Profile Avatar */}
            <div className="relative group cursor-pointer">
              <div className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-white p-1 shadow-2xl overflow-hidden ring-4 ring-white/10">
                <img
                  src={mockProfile.avatar}
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
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                  <path d="m15 5 4 4" />
                </svg>
              </div>
            </div>

            {/* Profile Details */}
            <div className="flex-1 text-center md:text-left mt-6 -mb-6">
              <div className="flex flex-col md:flex-row items-center gap-3 mb-2">
                <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                  {mockProfile.firstName} {mockProfile.lastName}
                </h1>
                <div className="bg-white text-[#ff6a00] hover:bg-white border-none py-0.5 px-3 flex items-center gap-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm">
                  Verified Member
                </div>
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
                      className="text-orange-400"
                    >
                      <rect width="20" height="16" x="2" y="4" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                    {mockProfile.email}
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
                      className="text-orange-400"
                    >
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    {mockProfile.phone}
                  </span>
                </div>

                {/* Profile Stats - Styled like Seller Storefront */}
                <div className="flex items-center justify-center md:justify-start gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-base font-bold">
                      {mockProfile.totalOrders || 0}
                    </span>
                    <span className="text-white/50 text-[10px] font-bold uppercase tracking-widest">
                      Orders
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-white text-base font-bold">
                        {mockProfile.bazcoins || 0}
                      </span>
                      <span className="text-white/50 text-[10px] font-bold uppercase tracking-widest">
                        Bazcoins
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white text-base font-bold">3</span>
                    <span className="text-white/50 text-[10px] font-bold uppercase tracking-widest">
                      Following
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-10 pb-12 relative z-20">
        {/* Content Tabs */}
        <Tabs defaultValue="personal" className="-mt-4 space-y-4">
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

          <TabsContent value="personal">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              <ProfileInfoSection profile={mockProfile} />
              <ProfileSummarySection profile={mockProfile} />
            </motion.div>
          </TabsContent>

          <TabsContent value="addresses">
            <AddressManagementSection userId="test-user-123" />
          </TabsContent>

          <TabsContent value="payments">
            <PaymentMethodsSection userId="test-user-123" />
          </TabsContent>

          <TabsContent value="following">
            <FollowingSection />
          </TabsContent>

          <TabsContent value="settings">
            <NotificationSettingsSection
              profile={mockProfile}
              onUpdatePreferences={(prefs) => {
                console.log("Updated preferences:", prefs);
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
