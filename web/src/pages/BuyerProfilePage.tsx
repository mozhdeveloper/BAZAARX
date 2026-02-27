/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
import { useProfileManager } from "@/hooks/profile/useProfileManager";
import { roleSwitchService } from "@/services/roleSwitchService";
import { getCurrentUser } from "@/lib/supabase";
import {
    ProfileInfoSection,
    ProfileSummarySection,
    AddressManagementSection,
    PaymentMethodsSection,
    FollowingSection,
    NotificationSettingsSection,
    AvatarUploadModal,
} from "@/components/profile";

export default function BuyerProfilePage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { profile, followedShops, updateProfile } = useBuyerStore();

    const [resolvedUserId, setResolvedUserId] = useState(profile?.id || "");
    const userId = resolvedUserId || profile?.id || "";
    const {
        checkSellerStatus,
        uploadAvatar,
        loading: profileLoading,
        error: profileError,
    } = useProfileManager(userId);

    const [activeTab, setActiveTab] = useState("personal");
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSeller, setIsSeller] = useState(false);

    useEffect(() => {
        if (profile?.id && profile.id !== resolvedUserId) {
            setResolvedUserId(profile.id);
        }
    }, [profile?.id, resolvedUserId]);

    useEffect(() => {
        let isMounted = true;

        const resolveSessionUser = async () => {
            if (profile?.id || resolvedUserId) return;
            const user = await getCurrentUser();
            if (isMounted && user?.id) {
                setResolvedUserId(user.id);
            }
        };

        resolveSessionUser();
        return () => {
            isMounted = false;
        };
    }, [profile?.id, resolvedUserId]);

    // Read tab from query param
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tab = params.get("tab");
        const validTabs = ["personal", "addresses", "payments", "following"];
        if (tab && validTabs.includes(tab)) {
            setActiveTab(tab);
        }
    }, [location.search]);

    // Check if user is also a seller
    const checkIfSeller = async () => {
        const sellerStatus = await checkSellerStatus({ force: true });
        setIsSeller(sellerStatus);
        return sellerStatus;
    };

    useEffect(() => {
        if (userId) {
            checkIfSeller();
        }
    }, [userId]);

    if (!profile && (!userId || profileLoading)) return <div>Loading...</div>;

    if (!profile) {
        return (
            <div className="min-h-screen bg-[var(--brand-wash)]">
                <Header />
                <div className="max-w-3xl mx-auto px-4 py-12">
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-orange-100">
                        <h2 className="text-lg font-bold text-[var(--text-headline)] mb-2">
                            Unable to load buyer profile
                        </h2>
                        <p className="text-sm text-[var(--text-secondary)] mb-4">
                            {profileError ||
                                "Please sign in again or refresh this page."}
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => window.location.reload()}
                            >
                                Retry
                            </Button>
                            <Button onClick={() => navigate("/login")}>
                                Go to Login
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--brand-wash)]">
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
                        <button
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-1 text-white/80 hover:text-[var(--brand-primary)] transition-colors mb-4 group px-3 -ml-2"
                        >
                            <ChevronLeft
                                size={20}
                                className="group-hover:-translate-x-0.5 transition-transform"
                            />
                            <span className="text-sm font-medium">Back</span>
                        </button>
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
                            <div className="absolute bottom-1 right-1 bg-[var(--bg-secondary)] text-[var(--brand-primary)] p-1.5 rounded-full shadow-lg border-2 border-[var(--brand-primary)]">
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
                                <Badge className="bg-[var(--bg-secondary)] text-[var(--brand-primary)] hover:bg-[var(--bg-secondary)] border-none py-0.5 px-3 flex items-center gap-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm">
                                    Verified Member
                                </Badge>
                            </div>

                            <div className="flex flex-col gap-1 mb-5">
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-white/80 text-sm font-medium">
                                    <span className="flex items-center gap-1.5 bg-black/20 px-3 py-1 rounded-full backdrop-blur-md border border-white/10">
                                        {profile.email}
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
                                            {followedShops?.length || 0}
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
                                    if (!userId) {
                                        navigate("/seller/auth");
                                        return;
                                    }

                                    const result =
                                        await roleSwitchService.switchToSellerMode(
                                            userId,
                                        );
                                    if (result.navigationState) {
                                        navigate(result.route, {
                                            state: result.navigationState,
                                        });
                                    } else {
                                        navigate(result.route);
                                    }
                                }}
                                className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white font-bold h-10 px-6 rounded-xl shadow-lg shadow-orange-600/20 flex items-center gap-2"
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
                        <TabsList className="inline-flex h-auto items-center justify-center rounded-full bg-white p-1 shadow-md border-0">
                            <TabsTrigger
                                value="personal"
                                className="rounded-full px-8 py-1.5 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--brand-primary)] data-[state=active]:bg-[var(--brand-primary)] data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
                            >
                                Personal Info
                            </TabsTrigger>
                            <TabsTrigger
                                value="addresses"
                                className="rounded-full px-8 py-1.5 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--brand-primary)] data-[state=active]:bg-[var(--brand-primary)] data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
                            >
                                Addresses
                            </TabsTrigger>
                            <TabsTrigger
                                value="payments"
                                className="rounded-full px-8 py-1.5 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--brand-primary)] data-[state=active]:bg-[var(--brand-primary)] data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
                            >
                                Payment Methods
                            </TabsTrigger>
                            <TabsTrigger
                                value="following"
                                className="rounded-full px-8 py-1.5 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--brand-primary)] data-[state=active]:bg-[var(--brand-primary)] data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
                            >
                                Following
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
                        <FollowingSection followedShops={followedShops} />
                    </TabsContent>

                    <TabsContent value="payments">
                        <PaymentMethodsSection userId={userId} />
                    </TabsContent>
                </Tabs>
            </div>

            {/* Edit Profile Modal */}
            <AvatarUploadModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                profile={profile}
                onAvatarUpdated={uploadAvatar}
            />
        </div >
    );
}
