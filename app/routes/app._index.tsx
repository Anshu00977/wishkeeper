import { useState } from "react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  BlockStack,
  Box,
  InlineStack,
  InlineGrid,
  Divider,
  Badge,
  Modal,
  TextContainer,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { findOrCreateStore, getAnalytics } from "../services/wishlist.server";
import { getActiveSubscription } from "../services/billing.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const store = await findOrCreateStore(session.shop);
  const analytics = await getAnalytics(store.id);
  const subscription = await getActiveSubscription(admin);
  const hasActivePlan = !!subscription;

  return json({ shop: session.shop, analytics, hasActivePlan });
};

export default function Index() {
  const { analytics, hasActivePlan } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(!hasActivePlan);

  return (
    <Page>
      <TitleBar title="Wishlist Dashboard" />

      <Modal
        open={modalOpen}
        onClose={() => { }}
        title="Subscribe to continue"
        primaryAction={{
          content: "View Plans",
          onAction: () => navigate("/app/billing"),
        }}
        noScroll
      >
        <Modal.Section>
          <TextContainer>
            <Text as="p" variant="bodyMd">
              You need an active plan to use WishKeeper. Choose a plan to get
              started.
            </Text>
          </TextContainer>
        </Modal.Section>
      </Modal>

      <BlockStack gap="500">
        <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="400">
          <StatCard
            title="Total Wishlist Items"
            value={analytics.totalItems}
            badge={
              analytics.recentItems > 0
                ? `+${analytics.recentItems} this week`
                : undefined
            }
          />
          <StatCard
            title="Active Wishlists"
            value={analytics.totalWishlists}
          />
          <StatCard
            title="Unique Customers"
            value={analytics.totalCustomers}
          />
          <StatCard title="Items Added (7d)" value={analytics.recentItems} />
        </InlineGrid>

        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Wishlist Activity (Last 7 Days)
                </Text>
                <Box paddingBlockStart="200">
                  <SimpleBarChart data={analytics.dailyCounts} />
                </Box>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Top Wishlisted Products
                </Text>
                <Divider />
                {analytics.topProducts.length === 0 ? (
                  <Text as="p" tone="subdued">
                    No wishlist data yet. Products will appear here once
                    customers start saving items.
                  </Text>
                ) : (
                  <BlockStack gap="300">
                    {analytics.topProducts.map(
                      (
                        product: {
                          productId: string;
                          _count: { productId: number };
                        },
                        index: number
                      ) => (
                        <InlineStack
                          key={product.productId}
                          align="space-between"
                          blockAlign="center"
                        >
                          <InlineStack gap="200" blockAlign="center">
                            <Box
                              background="bg-surface-secondary"
                              padding="100"
                              borderRadius="200"
                              minWidth="28px"
                            >
                              <Text
                                as="span"
                                variant="bodySm"
                                alignment="center"
                                fontWeight="semibold"
                              >
                                {index + 1}
                              </Text>
                            </Box>
                            <Text as="span" variant="bodySm" truncate>
                              {product.productId}
                            </Text>
                          </InlineStack>
                          <Badge>
                            {product._count.productId}{" "}
                            {product._count.productId === 1 ? "save" : "saves"}
                          </Badge>
                        </InlineStack>
                      )
                    )}
                  </BlockStack>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}

function StatCard({
  title,
  value,
  badge,
}: {
  title: string;
  value: number;
  badge?: string;
}) {
  return (
    <Card>
      <BlockStack gap="200">
        <Text as="p" variant="bodySm" tone="subdued">
          {title}
        </Text>
        <InlineStack align="space-between" blockAlign="end">
          <Text as="p" variant="headingXl" fontWeight="bold">
            {value.toLocaleString()}
          </Text>
          {badge && <Badge tone="success">{badge}</Badge>}
        </InlineStack>
      </BlockStack>
    </Card>
  );
}

function SimpleBarChart({
  data,
}: {
  data: { date: string; count: number }[];
}) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: "8px",
        height: "140px",
      }}
    >
      {data.map((d) => (
        <div
          key={d.date}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
            height: "100%",
            justifyContent: "flex-end",
          }}
        >
          <Text as="span" variant="bodySm" fontWeight="semibold">
            {d.count}
          </Text>
          <div
            style={{
              width: "100%",
              height: `${Math.max((d.count / max) * 100, 4)}%`,
              backgroundColor: "var(--p-color-bg-fill-brand)",
              borderRadius: "4px 4px 0 0",
              minHeight: "4px",
              transition: "height 0.3s ease",
            }}
          />
          <Text as="span" variant="bodySm" tone="subdued">
            {d.date}
          </Text>
        </div>
      ))}
    </div>
  );
}