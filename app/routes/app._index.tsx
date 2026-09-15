import { useState } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { data } from "react-router";
import { useLoaderData, useNavigate } from "react-router";
import { getActiveSubscription } from "../services/billing.server";
import { Page } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { findOrCreateStore, getAnalytics } from "../services/wishlist.server";
import dashboardStyles from "../styles/dashboard.css?url";

export const links = () => [{ rel: "stylesheet", href: dashboardStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const store = await findOrCreateStore(session.shop, session.accessToken!);
  const analytics = await getAnalytics(store.id);
  const subscription = await getActiveSubscription(admin);
  const hasActivePlan = !!subscription;
  return data({ shop: session.shop, analytics, hasActivePlan });
};

function Sparkline({ color, data }: { color: string; data: number[] }) {
  const w = 70, h = 30;
  const max = Math.max(...data, 1);
  const safeLen = Math.max(data.length - 1, 1);
  const pts = data.map((v, i) => `${(i / safeLen) * w},${h - (v / max) * (h - 4) - 2}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" style={{ display: "block" }}>
      <polyline points={pts} stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
    </svg>
  );
}

function LineChart({ data }: { data: { date: string; count: number }[] }) {
  const W = 560, H = 210, padL = 38, padR = 18, padT = 18, padB = 42;
  const max = Math.max(...data.map((d) => d.count), 1);
  const safeLen = Math.max(data.length - 1, 1);
  const toX = (i: number) => padL + (i / safeLen) * (W - padL - padR);
  const toY = (v: number) => padT + (1 - v / max) * (H - padT - padB);
  const pts = data.map((d, i) => `${toX(i)},${toY(d.count)}`).join(" ");
  const areaPath = `M${toX(0)},${H - padB} ` + data.map((d, i) => `L${toX(i)},${toY(d.count)}`).join(" ") + ` L${toX(data.length - 1)},${H - padB} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b8922a" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#b8922a" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[{ pct: 0, label: "0" }, { pct: 0.5, label: "0.5" }, { pct: 1, label: "1" }].map(({ pct, label }) => {
        const y = padT + (1 - pct) * (H - padT - padB);
        return (
          <g key={label}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="rgba(0,0,0,0.06)" strokeWidth="1" />
            <text x={padL - 7} y={y + 4} textAnchor="end" fontSize="10" fill="#a39a8e" fontFamily="DM Sans, sans-serif">{label}</text>
          </g>
        );
      })}
      <path d={areaPath} fill="url(#areaFill)" />
      <polyline points={pts} stroke="#b8922a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {data.map((d, i) => (
        <g key={d.date}>
          <circle cx={toX(i)} cy={toY(d.count)} r="6" fill="rgba(184,146,42,0.12)" />
          <circle cx={toX(i)} cy={toY(d.count)} r="3.5" fill="#b8922a" />
          <text x={toX(i)} y={toY(d.count) - 11} textAnchor="middle" fontSize="10" fill="#a39a8e" fontFamily="DM Sans, sans-serif" fontWeight="500">{d.count}</text>
          <text x={toX(i)} y={H - 10} textAnchor="middle" fontSize="10" fill="#a39a8e" fontFamily="DM Sans, sans-serif">{d.date}</text>
        </g>
      ))}
    </svg>
  );
}

function StatCard({ title, value, icon, iconBg, sparkColor, sparkData, footer, footerIcon, footerIconBg }: any) {
  return (
    <div className="dash-stat-card">
      <div className="dash-stat-card__row1">
        <div className="dash-stat-card__icon" style={{ background: iconBg }}>{icon}</div>
        <Sparkline color={sparkColor} data={sparkData} />
      </div>
      <p className="dash-stat-card__label">{title}</p>
      <p className="dash-stat-card__value">{value.toLocaleString()}</p>
      <div className="dash-stat-card__divider" />
      <div className="dash-stat-card__footer">
        <span className="dash-stat-card__footer-badge" style={{ background: footerIconBg }}>{footerIcon}</span>
        {footer}
      </div>
    </div>
  );
}

const IconItems = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1.5" stroke="#7c5cfc" strokeWidth="1.8" /><rect x="14" y="3" width="7" height="7" rx="1.5" stroke="#7c5cfc" strokeWidth="1.8" /><rect x="3" y="14" width="7" height="7" rx="1.5" stroke="#7c5cfc" strokeWidth="1.8" /><rect x="14" y="14" width="7" height="7" rx="1.5" stroke="#7c5cfc" strokeWidth="1.8" /></svg>);
const IconHeart = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="#16a34a"><path d="M12 21C12 21 3 14.5 3 8.5C3 5.42 5.42 3 8.5 3C10.24 3 11.91 3.81 13 5.08C14.09 3.81 15.76 3 17.5 3C20.58 3 23 5.42 23 8.5C23 14.5 12 21 12 21Z" /></svg>);
const IconPeople = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8"><circle cx="9" cy="7" r="3" /><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" /><path d="M16 3.13a4 4 0 010 7.75" strokeLinecap="round" /><path d="M21 21v-2a4 4 0 00-3-3.87" strokeLinecap="round" /></svg>);
const IconBag = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.8"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" strokeLinecap="round" strokeLinejoin="round" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" /></svg>);
const IconTrendUp = (color: string) => (<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>);
const IconTrophy = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#b8922a" strokeWidth="2"><path d="M8 21h8M12 17v4M17 4H7v9a5 5 0 0010 0V4z" strokeLinecap="round" strokeLinejoin="round" /><path d="M7 8H4a2 2 0 000 4h3M17 8h3a2 2 0 010 4h-3" strokeLinecap="round" /></svg>);
const IconChart = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#b8922a" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" strokeLinecap="round" strokeLinejoin="round" /></svg>);

function TrophyIllustration() {
  return (
    <svg width="90" height="90" viewBox="0 0 90 90" fill="none">
      <circle cx="45" cy="45" r="45" fill="#faf8f4" />
      <circle cx="45" cy="45" r="32" fill="#f9f1e1" />
      <path d="M33 27h24v21c0 6.627-5.373 12-12 12s-12-5.373-12-12V27z" fill="rgba(184,146,42,0.20)" stroke="rgba(184,146,42,0.40)" strokeWidth="1.5" />
      <path d="M33 31h-7a7 7 0 007 7v-7zM57 31h7a7 7 0 01-7 7v-7z" fill="rgba(184,146,42,0.15)" stroke="rgba(184,146,42,0.35)" strokeWidth="1.5" />
      <rect x="41" y="60" width="8" height="7" fill="rgba(184,146,42,0.25)" />
      <rect x="35" y="67" width="20" height="3.5" rx="1.75" fill="rgba(184,146,42,0.2)" />
      <path d="M45 33l2 5.5h5.5l-4.5 3.3 1.8 5.5-4.8-3.3-4.8 3.3 1.8-5.5-4.5-3.3H43z" fill="rgba(184,146,42,0.5)" />
    </svg>
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

export default function Index() {
  const { analytics, hasActivePlan } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(!hasActivePlan);
  const sparkData = analytics.dailyCounts.map((d: { count: number }) => d.count);

  return (
    <Page>
      <TitleBar title="Wishlist Dashboard" />
      <BillingModal open={modalOpen} onNavigate={() => navigate("/app/billing")} />
      <div className="dash-root">
        <div className="dash-header">
          <div className="dash-header__left">
            <div className="dash-header__eyebrow">Analytics Overview</div>
            <h1 className="dash-header__title">Wishlist <em>Dashboard</em></h1>
          </div>
          <div className="dash-header__right">
            <span className="dash-header__live-dot" />
            Live · updated just now
          </div>
        </div>
        <div className="dash-stats-grid">
          <StatCard title="Total Wishlist Items" value={analytics.totalItems} icon={<IconItems />} iconBg="#ede9fe" sparkColor="#7c5cfc" sparkData={sparkData} footer="All-time items saved" footerIcon={IconTrendUp("#7c5cfc")} footerIconBg="rgba(124,92,252,0.08)" />
          <StatCard title="Active Wishlists" value={analytics.totalWishlists} icon={<IconHeart />} iconBg="#dcfce7" sparkColor="#16a34a" sparkData={sparkData} footer="Customer lists created" footerIcon={IconTrendUp("#16a34a")} footerIconBg="rgba(22,163,74,0.08)" />
          <StatCard title="Unique Customers" value={analytics.totalCustomers} icon={<IconPeople />} iconBg="#dbeafe" sparkColor="#2563eb" sparkData={sparkData} footer="Shoppers with saved items" footerIcon={IconTrendUp("#2563eb")} footerIconBg="rgba(37,99,235,0.08)" />
          <StatCard title="Items Added (7d)" value={analytics.recentItems} icon={<IconBag />} iconBg="#fef3c7" sparkColor="#d97706" sparkData={sparkData} footer="Added this week" footerIcon={IconTrendUp("#d97706")} footerIconBg="rgba(217,119,6,0.08)" />
        </div>
        <div className="dash-bottom-row">
          <div className="dash-panel">
            <div className="dash-panel__header">
              <span className="dash-panel__title">
                <span className="dash-panel__title-icon"><IconChart /></span>
                Wishlist Activity
              </span>
              <div className="dash-date-pill">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                Last 7 days
              </div>
            </div>
            <LineChart data={analytics.dailyCounts} />
            <svg className="dash-panel__watermark" viewBox="0 0 24 24" fill="none">
              <path d="M12 21C12 21 3 14.5 3 8.5C3 5.42 5.42 3 8.5 3C10.24 3 11.91 3.81 13 5.08C14.09 3.81 15.76 3 17.5 3C20.58 3 23 5.42 23 8.5C23 14.5 12 21 12 21Z" fill="#b8922a" />
            </svg>
          </div>
          <div className="dash-panel">
            <div className="dash-panel__header">
              <span className="dash-panel__title">
                <span className="dash-panel__title-icon"><IconTrophy /></span>
                Top Products
              </span>
            </div>
            {analytics.topProducts.length === 0 ? (
              <div className="dash-empty">
                <TrophyIllustration />
                <p className="dash-empty__title">No data yet.</p>
                <p className="dash-empty__sub">Top products appear once customers start saving items.</p>
              </div>
            ) : (
              <div className="dash-products__list">
                {analytics.topProducts.map((product: { productId: string; _count: { productId: number } }, index: number) => (
                  <div key={product.productId} className="dash-products__row">
                    <div className="dash-products__row-left">
                      <div className="dash-products__rank">{index + 1}</div>
                      <span className="dash-products__name">{product.productId}</span>
                    </div>
                    <span className="dash-products__badge">{product._count.productId} {product._count.productId === 1 ? "save" : "saves"}</span>
                  </div>
                ))}
              </div>
            )}
            <svg className="dash-panel__watermark" viewBox="0 0 24 24" fill="none">
              <path d="M8 21h8M12 17v4M17 4H7v9a5 5 0 0010 0V4z" stroke="#b8922a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
    </Page>
  );
}