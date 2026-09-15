import { useState } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { data } from "react-router";
import { useLoaderData, useNavigate } from "react-router";
import { Page } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { getActiveSubscription } from "../services/billing.server";
import { authenticate } from "../shopify.server";
import { findOrCreateStore, getAllWishlists } from "../services/wishlist.server";
import wishlistStyles from "../styles/wishlist.css?url";

export const links = () => [{ rel: "stylesheet", href: wishlistStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const store = await findOrCreateStore(session.shop, session.accessToken!);
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const data2 = await getAllWishlists(store.id, page, 20);
  const subscription = await getActiveSubscription(admin);
  const hasActivePlan = !!subscription;
  return data({ ...data2, shop: session.shop, hasActivePlan });
};

const IconChevronLeft = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const IconChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const IconHeart = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#b8922a" strokeWidth="1.5">
    <path d="M12 21C12 21 3 14.5 3 8.5C3 5.42 5.42 3 8.5 3C10.24 3 11.91 3.81 13 5.08C14.09 3.81 15.76 3 17.5 3C20.58 3 23 5.42 23 8.5C23 14.5 12 21 12 21Z" />
  </svg>
);

function getInitials(customerId: string, isGuest: boolean): string {
  if (isGuest) return "G";
  const clean = customerId.replace(/\D/g, "");
  return clean ? clean.slice(0, 2) : "C";
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

export default function WishlistAdmin() {
  const { wishlists, total, page, totalPages, hasActivePlan } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(!hasActivePlan);

  if (wishlists.length === 0 && page === 1) {
    return (
      <Page>
        <TitleBar title="Wishlists" />
        <BillingModal open={modalOpen} onNavigate={() => navigate("/app/billing")} />
        <div className="wl-root">
          <div className="wl-header">
            <div className="wl-header__left">
              <div className="wl-header__eyebrow">Customer Data</div>
              <h1 className="wl-header__title">Customer <em>Wishlists</em></h1>
            </div>
            <div className="wl-header__right">
              <div className="wl-header__count">
                <span className="wl-header__count-num">0</span>
                wishlists total
              </div>
            </div>
          </div>
          <div className="wl-card">
            <div className="wl-empty">
              <div className="wl-empty__icon"><IconHeart /></div>
              <p className="wl-empty__title">No wishlists yet</p>
              <p className="wl-empty__sub">Wishlists will appear here once customers start saving products to their favourites.</p>
            </div>
          </div>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <TitleBar title="Wishlists" />
      <BillingModal open={modalOpen} onNavigate={() => navigate("/app/billing")} />
      <div className="wl-root">
        <div className="wl-header">
          <div className="wl-header__left">
            <div className="wl-header__eyebrow">Customer Data</div>
            <h1 className="wl-header__title">Customer <em>Wishlists</em></h1>
          </div>
          <div className="wl-header__right">
            <div className="wl-header__count">
              <span className="wl-header__count-num">{total}</span>
              wishlist{total !== 1 ? "s" : ""} total
            </div>
          </div>
        </div>

        <div className="wl-card">
          <table className="wl-table">
            <thead className="wl-table__head">
              <tr>
                <th>Customer</th>
                <th>Wishlist Name</th>
                <th>Items</th>
                <th>Last Active</th>
              </tr>
            </thead>
            <tbody>
              {wishlists.map((wl: any) => {
                const isGuest = wl.customerId.startsWith("guest_");
                const initials = getInitials(wl.customerId, isGuest);
                const shortId = wl.customerId.length > 22 ? wl.customerId.slice(0, 22) + "…" : wl.customerId;
                const lastActive = new Date(wl.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                const itemCount: number = wl._count.items;

                return (
                  <tr key={wl.id} className="wl-table__row">
                    <td>
                      <div className="wl-customer">
                        <div className={`wl-avatar${isGuest ? " wl-avatar--guest" : ""}`}>{initials}</div>
                        <div>
                          <div className="wl-customer__name">{shortId}</div>
                          {isGuest && <span className="wl-badge wl-badge--guest">Guest</span>}
                        </div>
                      </div>
                    </td>
                    <td><span className="wl-name">{wl.name}</span></td>
                    <td>
                      <span className={`wl-badge ${itemCount > 0 ? "wl-badge--items" : "wl-badge--zero"}`}>
                        {itemCount} {itemCount === 1 ? "item" : "items"}
                      </span>
                    </td>
                    <td><span className="wl-date">{lastActive}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="wl-pagination">
            <button className="wl-pagination__btn" disabled={page <= 1} onClick={() => navigate(`?page=${page - 1}`)}>
              <IconChevronLeft />Previous
            </button>
            <span className="wl-pagination__info">Page <span>{page}</span> of <span>{totalPages}</span></span>
            <button className="wl-pagination__btn" disabled={page >= totalPages} onClick={() => navigate(`?page=${page + 1}`)}>
              Next<IconChevronRight />
            </button>
          </div>
        )}
      </div>
    </Page>
  );
}