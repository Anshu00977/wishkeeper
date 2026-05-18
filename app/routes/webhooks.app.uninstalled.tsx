import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const action = async ({ request }: { request: Request }) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`Webhook received: ${topic} for ${shop}`);

  if (topic === "APP_UNINSTALLED") {
    await prisma.store.updateMany({
      where: { shop },
      data: { isActive: false, uninstalledAt: new Date() },
    });

    if (session) {
      await prisma.session.deleteMany({ where: { shop } });
    }
  }

  return new Response(null, { status: 200 });
};  