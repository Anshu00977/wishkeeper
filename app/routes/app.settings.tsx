import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  InlineGrid,
  Checkbox,
  Select,
  TextField,
  Button,
  Banner,
  Divider,
  Box,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import {
  findOrCreateStore,
  getStoreSettings,
  updateStoreSettings,
} from "../services/wishlist.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const store = await findOrCreateStore(session.shop);
  const settings = await getStoreSettings(store.id);
  return json({ shop: session.shop, settings, storeId: store.id });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const store = await findOrCreateStore(session.shop);

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

  return json({ success: true });
};

export default function Settings() {
  const { settings } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSaving = navigation.state === "submitting";

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

  function handleSave() {
    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      formData.append(key, String(value));
    });
    submit(formData, { method: "POST" });
  }

  return (
    <Page>
      <TitleBar title="Wishlist Settings" />
      <BlockStack gap="500">
        {navigation.state === "idle" &&
          navigation.formData !== undefined && (
            <Banner tone="success" title="Settings saved successfully" />
          )}

        {/* ─── Wishlist Page Display ─── */}
        <Layout>
          <Layout.AnnotatedSection
            title="Wishlist Page Display"
            description="Control what information is shown on the customer-facing wishlist page."
          >
            <Card>
              <BlockStack gap="400">
                <Checkbox
                  label="Show product title"
                  checked={form.showTitle}
                  onChange={(v) => setForm({ ...form, showTitle: v })}
                />
                <Checkbox
                  label="Show product price"
                  checked={form.showPrice}
                  onChange={(v) => setForm({ ...form, showPrice: v })}
                />
                {/* <Checkbox
                  label="Show Add to Cart button"
                  checked={form.showAddToCart}
                  onChange={(v) => setForm({ ...form, showAddToCart: v })}
                /> */}
                {/* <Checkbox
                  label="Show product vendor"
                  checked={form.showVendor}
                  onChange={(v) => setForm({ ...form, showVendor: v })}
                /> */}
                <Checkbox
                  label="Show item count"
                  checked={form.showItemCount}
                  onChange={(v) => setForm({ ...form, showItemCount: v })}
                />
                <Checkbox
                  label="Show share button"
                  checked={form.showShareButton}
                  onChange={(v) => setForm({ ...form, showShareButton: v })}
                />
                <Divider />
                <Select
                  label="Grid columns"
                  options={[
                    { label: "2 columns", value: "2" },
                    { label: "3 columns", value: "3" },
                    { label: "4 columns", value: "4" },
                    { label: "5 columns", value: "5" },
                  ]}
                  value={form.gridColumns}
                  onChange={(v) => setForm({ ...form, gridColumns: v })}
                />
              </BlockStack>
            </Card>
          </Layout.AnnotatedSection>
        </Layout>

        {/* ─── Wishlist Icon ─── */}
        <Layout>
          <Layout.AnnotatedSection
            title="Wishlist Icon"
            description="Configure the wishlist icon that appears on product pages and in the store header."
          >
            <Card>
              <BlockStack gap="400">
                <Checkbox
                  label="Show wishlist icon in header"
                  helpText="Adds a heart icon next to the cart icon in your store header"
                  checked={form.headerIconEnabled}
                  onChange={(v) => setForm({ ...form, headerIconEnabled: v })}
                />
                <Select
                  label="Icon style"
                  options={[
                    { label: "Heart", value: "heart" },
                    { label: "Bookmark", value: "bookmark" },
                    { label: "Star", value: "star" },
                  ]}
                  value={form.iconStyle}
                  onChange={(v) => setForm({ ...form, iconStyle: v })}
                />
                <InlineGrid columns={2} gap="400">
                  <TextField
                    label="Active color"
                    type="text"
                    value={form.activeColor}
                    onChange={(v) => setForm({ ...form, activeColor: v })}
                    autoComplete="off"
                    connectedRight={
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 6,
                          backgroundColor: form.activeColor,
                          border: "1px solid #ccc",
                        }}
                      />
                    }
                  />
                  <TextField
                    label="Max items per wishlist"
                    type="number"
                    value={form.maxItemsPerList}
                    onChange={(v) => setForm({ ...form, maxItemsPerList: v })}
                    autoComplete="off"
                  />
                </InlineGrid>
              </BlockStack>
            </Card>
          </Layout.AnnotatedSection>
        </Layout>

        {/* ─── Save ─── */}
        <InlineStack align="end">
          <Button variant="primary" onClick={handleSave} loading={isSaving}>
            Save Settings
          </Button>
        </InlineStack>
      </BlockStack>
    </Page>
  );
}
