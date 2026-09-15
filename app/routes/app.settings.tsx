import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { data } from "react-router";
import {
  useLoaderData,
  useSubmit,
  useNavigation,
  useNavigate,
} from "react-router";
import { Page } from "@shopify/polaris";
import { getActiveSubscription } from "../services/billing.server";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import {
  findOrCreateStore,
  getStoreSettings,
  updateStoreSettings,
} from "../services/wishlist.server";
import settingsStyles from "../styles/settings.css?url";

export const links = () => [{ rel: "stylesheet", href: settingsStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const store = await findOrCreateStore(session.shop, session.accessToken!);
  const settings = await getStoreSettings(store.id);
  const subscription = await getActiveSubscription(admin);
  const hasActivePlan = !!subscription;
  return data({ shop: session.shop, settings, storeId: store.id, hasActivePlan });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const store = await findOrCreateStore(session.shop, session.accessToken!);
  const formData = await request.formData();
  await updateStoreSettings(store.id, {
    showTitle: formData.get("showTitle") === "true",
    showPrice: formData.get("showPrice") === "true",
    showAddToCart: formData.get("showAddToCart") === "true",
    showVendor: formData.get("showVendor") === "true",
    showShareButton: formData.get("showShareButton") === "true",
    showItemCount: formData.get("showItemCount") === "true",
    headerIconEnabled: formData.get("headerIconEnabled") === "true",
    gridColumns: parseInt(formData.get("gridColumns") as string) || 4,
    maxItemsPerList: parseInt(formData.get("maxItemsPerList") as string) || 50,
    iconStyle: (formData.get("iconStyle") as string) || "heart",
    activeColor: (formData.get("activeColor") as string) || "#e74c6f",
  });
  return data({ success: true });
};

// ── Icons ──────────────────────────────────────────────────────────────────
const IconDisplay = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b8922a" strokeWidth="2">
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

const IconWand = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b8922a" strokeWidth="2">
    <path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8L19 13M17.8 6.2L19 5M12.2 6.2L11 5M12.2 11.8L11 13" strokeLinecap="round" />
    <path d="M3 21l9-9" strokeLinecap="round" />
    <path d="M12.2 6.2l5.6 5.6-9 9-5.6-5.6 9-9z" />
  </svg>
);

const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconHeart = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 21C12 21 3 14.5 3 8.5C3 5.42 5.42 3 8.5 3C10.24 3 11.91 3.81 13 5.08C14.09 3.81 15.76 3 17.5 3C20.58 3 23 5.42 23 8.5C23 14.5 12 21 12 21Z" />
  </svg>
);

const IconBookmark = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconStar = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="st-toggle" onClick={(e) => e.stopPropagation()}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="st-toggle__track" />
      <span className="st-toggle__thumb" />
    </label>
  );
}

function ToggleRow({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="st-toggle-row" onClick={() => onChange(!checked)}>
      <div>
        <div className="st-toggle-row__label">{label}</div>
        {hint && <div className="st-toggle-row__hint">{hint}</div>}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function BillingModal({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.45)" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "32px 28px", maxWidth: 420, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#f9f1e1", border: "1.5px solid rgba(184,146,42,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#b8922a" strokeWidth="1.6" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg>
        </div>
        <p style={{ fontSize: 18, fontWeight: 700, color: "#1a1612", margin: "0 0 8px" }}>Subscribe to continue</p>
        <p style={{ fontSize: 13, color: "#6b6257", margin: "0 0 20px", lineHeight: 1.6 }}>You need an active plan to use this app. Plans start from <strong style={{ color: "#b8922a" }}>$9.99 / month</strong>.</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 20 }}>
          {["❤️ Wishlists", "📊 Analytics", "🎨 Customisation"].map((f) => (
            <div key={f} style={{ padding: "7px 12px", background: "#faf8f4", border: "1px solid rgba(184,146,42,0.18)", borderRadius: 8, fontSize: 11, fontWeight: 500, color: "#6b6257" }}>{f}</div>
          ))}
        </div>
        <button onClick={onNavigate} style={{ width: "100%", padding: "12px 24px", background: "#b8922a", color: "#fff", border: "none", borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          View Plans
        </button>
      </div>
    </div>
  );
}

export default function Settings() {
  const { settings, hasActivePlan } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const isSaving = navigation.state === "submitting";
  const [modalOpen, setModalOpen] = useState(!hasActivePlan);

  const [form, setForm] = useState({
    showTitle: settings?.showTitle ?? true,
    showPrice: settings?.showPrice ?? true,
    showAddToCart: settings?.showAddToCart ?? true,
    showVendor: settings?.showVendor ?? false,
    showShareButton: settings?.showShareButton ?? true,
    showItemCount: settings?.showItemCount ?? true,
    headerIconEnabled: settings?.headerIconEnabled ?? true,
    gridColumns: String(settings?.gridColumns ?? 4),
    maxItemsPerList: String(settings?.maxItemsPerList ?? 50),
    iconStyle: settings?.iconStyle ?? "heart",
    activeColor: settings?.activeColor ?? "#e74c6f",
  });

  const set = (key: string, value: any) => setForm((prev) => ({ ...prev, [key]: value }));

  function handleSave() {
    const formData = new FormData();
    Object.entries(form).forEach(([k, v]) => formData.append(k, String(v)));
    submit(formData, { method: "POST" });
  }

  const saved = navigation.state === "idle" && navigation.formData !== undefined;

  return (
    <Page>
      <TitleBar title="Settings" />
        <BillingModal open={modalOpen} onNavigate={() => navigate("/app/billing")} />
      <div className="st-root">
        <div className="st-header">
          <div className="st-header__left">
            <div className="st-header__eyebrow">Configuration</div>
            <h1 className="st-header__title">Wishlist <em>Settings</em></h1>
            <p className="st-header__sub">Customise how WishKeeper looks and behaves in your store.</p>
          </div>
        </div>

        {saved && (
          <div className="st-banner">
            <div className="st-banner__icon"><IconCheck /></div>
            Settings saved successfully
          </div>
        )}

        <div className="st-grid">
          <div className="st-card">
            <div className="st-card__head">
              <div className="st-card__head-row">
                <div className="st-card__icon"><IconDisplay /></div>
                <h2 className="st-card__title">Page Display</h2>
              </div>
              <p className="st-card__desc">Control what customers see on their wishlist page.</p>
            </div>
            <div className="st-card__body">
              <ToggleRow label="Show product title" checked={form.showTitle} onChange={(v) => set("showTitle", v)} />
              <ToggleRow label="Show product price" checked={form.showPrice} onChange={(v) => set("showPrice", v)} />
              <ToggleRow label="Show Add to Cart button" checked={form.showAddToCart} onChange={(v) => set("showAddToCart", v)} />
              <ToggleRow label="Show vendor name" checked={form.showVendor} onChange={(v) => set("showVendor", v)} />
              <ToggleRow label="Show share button" checked={form.showShareButton} onChange={(v) => set("showShareButton", v)} />
              <ToggleRow label="Show item count" checked={form.showItemCount} onChange={(v) => set("showItemCount", v)} />
              <div className="st-divider" />
              <div className="st-field">
                <label className="st-field__label">Grid columns</label>
                <div className="st-field__select-wrap">
                  <select className="st-field__select" value={form.gridColumns} onChange={(e) => set("gridColumns", e.target.value)}>
                    <option value="2">2 columns</option>
                    <option value="3">3 columns</option>
                    <option value="4">4 columns</option>
                    <option value="5">5 columns</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="st-card">
            <div className="st-card__head">
              <div className="st-card__head-row">
                <div className="st-card__icon"><IconWand /></div>
                <h2 className="st-card__title">Icon & Appearance</h2>
              </div>
              <p className="st-card__desc">Configure the wishlist icon and active colour.</p>
            </div>
            <div className="st-card__body">
              <ToggleRow label="Show icon in store header" hint="Adds a wishlist icon next to the cart" checked={form.headerIconEnabled} onChange={(v) => set("headerIconEnabled", v)} />
              <div className="st-divider" />
              <div className="st-field">
                <label className="st-field__label">Icon style</label>
                <div className="st-icon-picker">
                  {([{ value: "heart", Icon: IconHeart, label: "Heart" }, { value: "bookmark", Icon: IconBookmark, label: "Bookmark" }, { value: "star", Icon: IconStar, label: "Star" }] as const).map(({ value, Icon, label }) => (
                    <button key={value} type="button" className={`st-icon-option${form.iconStyle === value ? " active" : ""}`} onClick={() => set("iconStyle", value)}>
                      <Icon size={22} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="st-divider" />
              <div className="st-field-row">
                <div className="st-field">
                  <label className="st-field__label">Active colour</label>
                  <div className="st-color-row">
                    <input className="st-field__input" type="text" value={form.activeColor} onChange={(e) => set("activeColor", e.target.value)} autoComplete="off" />
                    <div className="st-color-swatch" style={{ background: form.activeColor }}>
                      <input type="color" value={form.activeColor} onChange={(e) => set("activeColor", e.target.value)} />
                    </div>
                  </div>
                </div>
                <div className="st-field">
                  <label className="st-field__label">Max items per list</label>
                  <input className="st-field__input" type="number" value={form.maxItemsPerList} onChange={(e) => set("maxItemsPerList", e.target.value)} autoComplete="off" min={1} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="st-save-bar">
          <span className="st-save-hint">{isSaving ? "Saving…" : "Changes are saved immediately"}</span>
          <button className="st-save-btn" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving…" : <><IconCheck />Save Settings</>}
          </button>
        </div>
      </div>
    </Page>
  );
}