export type SwitchSourceMode = "buyer" | "seller";
export type SwitchTargetMode = "buyer" | "seller";

export interface RoleSwitchContext {
    sourceMode: SwitchSourceMode;
    targetMode: SwitchTargetMode;
    userId: string;
    email: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    createdAt: string;
}

export const ROLE_SWITCH_CONTEXT_STORAGE_KEY = "roleSwitchContextV2";
const ROLE_SWITCH_CONTEXT_TTL_MS = 15 * 60 * 1000;

const isValidSwitchContext = (
    value: unknown,
): value is RoleSwitchContext => {
    if (!value || typeof value !== "object") return false;
    const ctx = value as Partial<RoleSwitchContext>;

    return Boolean(
        (ctx.sourceMode === "buyer" || ctx.sourceMode === "seller") &&
            (ctx.targetMode === "buyer" || ctx.targetMode === "seller") &&
            typeof ctx.userId === "string" &&
            ctx.userId.length > 0 &&
            typeof ctx.email === "string" &&
            typeof ctx.createdAt === "string",
    );
};

const isExpired = (createdAt: string): boolean => {
    const created = Date.parse(createdAt);
    if (Number.isNaN(created)) return true;
    return Date.now() - created > ROLE_SWITCH_CONTEXT_TTL_MS;
};

export const saveRoleSwitchContext = (context: RoleSwitchContext): void => {
    if (typeof window === "undefined") return;
    try {
        window.sessionStorage.setItem(
            ROLE_SWITCH_CONTEXT_STORAGE_KEY,
            JSON.stringify(context),
        );
    } catch (error) {
        console.error("Failed to store role switch context:", error);
    }
};

export const clearRoleSwitchContext = (): void => {
    if (typeof window === "undefined") return;
    try {
        window.sessionStorage.removeItem(ROLE_SWITCH_CONTEXT_STORAGE_KEY);
    } catch (error) {
        console.error("Failed to clear role switch context:", error);
    }
};

export const readRoleSwitchContext = (
    expectedTargetMode?: SwitchTargetMode,
): RoleSwitchContext | null => {
    if (typeof window === "undefined") return null;

    try {
        const raw = window.sessionStorage.getItem(
            ROLE_SWITCH_CONTEXT_STORAGE_KEY,
        );
        if (!raw) return null;

        const parsed = JSON.parse(raw) as unknown;
        if (!isValidSwitchContext(parsed)) {
            clearRoleSwitchContext();
            return null;
        }

        if (isExpired(parsed.createdAt)) {
            clearRoleSwitchContext();
            return null;
        }

        if (
            expectedTargetMode &&
            parsed.targetMode !== expectedTargetMode
        ) {
            return null;
        }

        return parsed;
    } catch (error) {
        console.error("Failed to read role switch context:", error);
        clearRoleSwitchContext();
        return null;
    }
};

