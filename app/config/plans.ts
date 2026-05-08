export interface Plan {
    key: string;
    label: string;
    price: number;
    trialDays: number;
    features: string[];
    color: string;
    popular: boolean;
}

export const PLANS: Record<string, Plan> = {
    basic: {
        key: "basic",
        label: "Basic Plan",
        price: 10,
        trialDays: 0,
        color: "#F6F6F7",
        popular: false,
        features: [
            "Save up to 10 wishlist items",
            "Simple wishlist management",
            "Mobile friendly",
            "Fast access",
        ],
    },
    pro: {
        key: "pro",
        label: "Pro Plan",
        price: 15,
        trialDays: 0,
        color: "#F0F4FF",
        popular: true,
        features: [
            "Save unlimited wishlist items",
            "Simple wishlist management",
            "Mobile friendly",
            "Fast access",
        ],
    },
};

export const PLAN_KEYS = Object.keys(PLANS);