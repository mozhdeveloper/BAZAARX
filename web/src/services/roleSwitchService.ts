import { authService } from "@/services/authService";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import {
    saveRoleSwitchContext,
    type RoleSwitchContext,
} from "@/services/roleSwitchContext";
import type { UserRole } from "@/types/database.types";

export type ActiveUserMode = "buyer" | "seller";

export interface RoleSwitchResult {
    ok: boolean;
    mode: ActiveUserMode;
    route: string;
    reason?: string;
    navigationState?: Record<string, unknown>;
}

export const isRoleSwitchV2Enabled = (): boolean => {
    const raw = (
        (import.meta as { env?: { VITE_ROLE_SWITCH_V2?: string } }).env
            ?.VITE_ROLE_SWITCH_V2 || ""
    )
        .trim()
        .toLowerCase();

    return raw === "1" || raw === "true" || raw === "yes";
};

class RoleSwitchService {
    private async resolveUserId(userId?: string): Promise<string | null> {
        if (userId) {
            return userId;
        }

        if (!isSupabaseConfigured()) {
            return null;
        }

        const {
            data: { user },
            error,
        } = await supabase.auth.getUser();

        if (error || !user?.id) {
            return null;
        }

        return user.id;
    }

    async getRoles(userId: string): Promise<UserRole[]> {
        if (!userId) return [];
        return authService.getUserRoles(userId);
    }

    async hasRole(userId: string, role: UserRole): Promise<boolean> {
        if (!userId) return false;
        return authService.hasRole(userId, role);
    }

    async ensureBuyerRoleAndRecord(userId: string): Promise<void> {
        if (!userId) return;
        await authService.createBuyerAccount(userId);
    }

    private async getProfileBasics(userId: string): Promise<{
        email: string;
        phone?: string;
        firstName?: string;
        lastName?: string;
    }> {
        const { data, error } = await supabase
            .from("profiles")
            .select("email, phone, first_name, last_name")
            .eq("id", userId)
            .maybeSingle();

        if (error) {
            throw error;
        }

        const {
            data: { user },
        } = await supabase.auth.getUser();

        return {
            email: data?.email || user?.email || "",
            phone: data?.phone || undefined,
            firstName: data?.first_name || undefined,
            lastName: data?.last_name || undefined,
        };
    }

    private buildSwitchContext(
        sourceMode: ActiveUserMode,
        targetMode: ActiveUserMode,
        userId: string,
        profile: {
            email: string;
            phone?: string;
            firstName?: string;
            lastName?: string;
        },
    ): RoleSwitchContext {
        return {
            sourceMode,
            targetMode,
            userId,
            email: profile.email,
            phone: profile.phone,
            firstName: profile.firstName,
            lastName: profile.lastName,
            createdAt: new Date().toISOString(),
        };
    }

    private async hasBuyerRecord(userId: string): Promise<boolean> {
        const { data, error } = await supabase
            .from("buyers")
            .select("id")
            .eq("id", userId)
            .maybeSingle();

        if (error) {
            throw error;
        }

        return Boolean(data?.id);
    }

    private async hasSellerRecord(userId: string): Promise<boolean> {
        const { data, error } = await supabase
            .from("sellers")
            .select("id")
            .eq("id", userId)
            .maybeSingle();

        if (error) {
            throw error;
        }

        return Boolean(data?.id);
    }

    async switchToSellerMode(userId?: string): Promise<RoleSwitchResult> {
        const resolvedUserId = await this.resolveUserId(userId);
        if (!resolvedUserId) {
            return {
                ok: false,
                mode: "seller",
                route: "/login",
                reason: "missing_user_id",
            };
        }

        if (!isSupabaseConfigured()) {
            return {
                ok: true,
                mode: "seller",
                route: "/seller/register",
                reason: "supabase_not_configured",
            };
        }

        try {
            const [hasSellerRole, hasSellerRecord] = await Promise.all([
                this.hasRole(resolvedUserId, "seller"),
                this.hasSellerRecord(resolvedUserId),
            ]);

            const profile = await this.getProfileBasics(resolvedUserId);

            if (hasSellerRecord && !hasSellerRole) {
                // Heal role drift for legacy users with seller rows.
                await authService.addUserRole(resolvedUserId, "seller");
            }

            if (hasSellerRecord) {
                const { useAuthStore } = await import("@/stores/sellerStore");
                const hydrated =
                    await useAuthStore.getState().hydrateSellerFromSession();
                if (!hydrated) {
                    return {
                        ok: true,
                        mode: "seller",
                        route: "/seller/login",
                        reason: "seller_context_hydration_failed",
                        navigationState: {
                            prefillEmail: profile.email,
                        },
                    };
                }

                return {
                    ok: true,
                    mode: "seller",
                    route: "/seller",
                };
            }

            if (hasSellerRole && !hasSellerRecord) {
                const context = this.buildSwitchContext(
                    "buyer",
                    "seller",
                    resolvedUserId,
                    profile,
                );
                saveRoleSwitchContext(context);
                return {
                    ok: true,
                    mode: "seller",
                    route: "/seller/register",
                    reason: "missing_seller_record",
                    navigationState: { roleSwitchContext: context },
                };
            }

            const context = this.buildSwitchContext(
                "buyer",
                "seller",
                resolvedUserId,
                profile,
            );
            saveRoleSwitchContext(context);

            return {
                ok: true,
                mode: "seller",
                route: "/seller/register",
                reason: "needs_seller_registration",
                navigationState: { roleSwitchContext: context },
            };
        } catch (error) {
            console.error("Error switching to seller mode:", error);
            return {
                ok: false,
                mode: "seller",
                route: "/seller/register",
                reason: "switch_failed",
            };
        }
    }

    async switchToBuyerMode(userId?: string): Promise<RoleSwitchResult> {
        const resolvedUserId = await this.resolveUserId(userId);
        if (!resolvedUserId) {
            return {
                ok: false,
                mode: "buyer",
                route: "/login",
                reason: "missing_user_id",
            };
        }

        if (!isSupabaseConfigured()) {
            return {
                ok: true,
                mode: "buyer",
                route: "/profile",
                reason: "supabase_not_configured",
            };
        }

        try {
            const [hasBuyerRole, hasBuyerRecord] = await Promise.all([
                this.hasRole(resolvedUserId, "buyer"),
                this.hasBuyerRecord(resolvedUserId),
            ]);

            const profile = await this.getProfileBasics(resolvedUserId);

            if (hasBuyerRecord) {
                if (!hasBuyerRole) {
                    await authService.addUserRole(resolvedUserId, "buyer");
                }

                try {
                    const { useBuyerStore } = await import("@/stores/buyerStore");
                    await useBuyerStore
                        .getState()
                        .initializeBuyerProfile(resolvedUserId, {});
                } catch (profileError) {
                    console.error(
                        "Buyer profile pre-initialization failed during mode switch:",
                        profileError,
                    );
                }

                return {
                    ok: true,
                    mode: "buyer",
                    route: "/profile",
                };
            }

            const context = this.buildSwitchContext(
                "seller",
                "buyer",
                resolvedUserId,
                profile,
            );
            saveRoleSwitchContext(context);

            return {
                ok: true,
                mode: "buyer",
                route: "/signup",
                reason: hasBuyerRole
                    ? "missing_buyer_record"
                    : "needs_buyer_registration",
                navigationState: { roleSwitchContext: context },
            };
        } catch (error) {
            console.error("Error switching to buyer mode:", error);
            return {
                ok: false,
                mode: "buyer",
                route: "/profile",
                reason: "switch_failed",
            };
        }
    }
}

export const roleSwitchService = new RoleSwitchService();
