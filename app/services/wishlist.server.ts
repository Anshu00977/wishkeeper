import prisma from "../db.server";

// ─── Store ───────────────────────────────────────────────────────────

export async function findOrCreateStore(shop: string) {
  const store = await prisma.store.upsert({
    where: { shop },
    update: { isActive: true },
    create: { shop },
  });

  await prisma.storeSettings.upsert({
    where: { storeId: store.id },
    update: {},
    create: { storeId: store.id },
  });

  return store;
}

export async function getStoreByShop(shop: string) {
  return prisma.store.findUnique({ where: { shop } });
}

// ─── Settings ────────────────────────────────────────────────────────

export async function getStoreSettings(storeId: string) {
  return prisma.storeSettings.findUnique({ where: { storeId } });
}

export async function getStoreSettingsByShop(shop: string) {
  const store = await getStoreByShop(shop);
  if (!store) return null;
  return prisma.storeSettings.findUnique({ where: { storeId: store.id } });
}

export async function updateStoreSettings(
  storeId: string,
  data: {
    showShareButton?: boolean;
    showItemCount?: boolean;
    maxItemsPerList?: number;
    showTitle?: boolean;
    showPrice?: boolean;
    showAddToCart?: boolean;
    showVendor?: boolean;
    gridColumns?: number;
    iconStyle?: string;
    activeColor?: string;
    headerIconEnabled?: boolean;
  }
) {
  return prisma.storeSettings.upsert({
    where: { storeId },
    update: data,
    create: { storeId, ...data },
  });
}

// ─── Wishlist ────────────────────────────────────────────────────────

export async function getWishlist(storeId: string, customerId: string) {
  let wishlist = await prisma.wishlist.findFirst({
    where: { storeId, customerId },
    include: { items: { orderBy: { addedAt: "desc" } } },
  });

  if (!wishlist) {
    wishlist = await prisma.wishlist.create({
      data: { storeId, customerId, name: "My Wishlist" },
      include: { items: true },
    });
  }

  return wishlist;
}

export async function getWishlistCount(storeId: string, customerId: string) {
  const wishlist = await prisma.wishlist.findFirst({
    where: { storeId, customerId },
  });
  if (!wishlist) return 0;
  return prisma.wishlistItem.count({ where: { wishlistId: wishlist.id } });
}

export async function addWishlistItem(
  storeId: string,
  customerId: string,
  productId: string,
  variantId?: string | null
) {
  const wishlist = await getWishlist(storeId, customerId);

  const existing = await prisma.wishlistItem.findFirst({
    where: { wishlistId: wishlist.id, productId, variantId: variantId || null },
  });
  if (existing) return existing;

  const settings = await prisma.storeSettings.findUnique({ where: { storeId } });
  const maxItems = settings?.maxItemsPerList ?? 50;
  const currentCount = await prisma.wishlistItem.count({ where: { wishlistId: wishlist.id } });

  if (currentCount >= maxItems) {
    throw new Error(`Wishlist is full. Maximum ${maxItems} items allowed.`);
  }

  return prisma.wishlistItem.create({
    data: { wishlistId: wishlist.id, productId, variantId: variantId || null },
  });
}

export async function removeWishlistItem(
  storeId: string,
  customerId: string,
  productId: string,
  variantId?: string | null
) {
  const wishlist = await prisma.wishlist.findFirst({ where: { storeId, customerId } });
  if (!wishlist) return null;

  return prisma.wishlistItem.deleteMany({
    where: { wishlistId: wishlist.id, productId, variantId: variantId || null },
  });
}

export async function isInWishlist(storeId: string, customerId: string, productId: string) {
  const wishlist = await prisma.wishlist.findFirst({ where: { storeId, customerId } });
  if (!wishlist) return false;
  const item = await prisma.wishlistItem.findFirst({ where: { wishlistId: wishlist.id, productId } });
  return !!item;
}

export async function mergeGuestWishlist(storeId: string, guestId: string, customerId: string) {
  const guestWishlist = await prisma.wishlist.findFirst({
    where: { storeId, customerId: guestId },
    include: { items: true },
  });

  if (!guestWishlist || guestWishlist.items.length === 0) return;

  const customerWishlist = await getWishlist(storeId, customerId);

  for (const item of guestWishlist.items) {
    const exists = await prisma.wishlistItem.findFirst({
      where: { wishlistId: customerWishlist.id, productId: item.productId, variantId: item.variantId },
    });
    if (!exists) {
      await prisma.wishlistItem.create({
        data: { wishlistId: customerWishlist.id, productId: item.productId, variantId: item.variantId },
      });
    }
  }

  await prisma.wishlistItem.deleteMany({ where: { wishlistId: guestWishlist.id } });
  await prisma.wishlist.delete({ where: { id: guestWishlist.id } });
}

// ─── Analytics ───────────────────────────────────────────────────────

export async function getAnalytics(storeId: string) {
  const totalItems = await prisma.wishlistItem.count({ where: { wishlist: { storeId } } });
  const totalWishlists = await prisma.wishlist.count({ where: { storeId } });
  const totalCustomers = await prisma.wishlist.groupBy({ by: ["customerId"], where: { storeId } });

  const topProducts = await prisma.wishlistItem.groupBy({
    by: ["productId"],
    where: { wishlist: { storeId } },
    _count: { productId: true },
    orderBy: { _count: { productId: "desc" } },
    take: 10,
  });

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentItems = await prisma.wishlistItem.count({
    where: { wishlist: { storeId }, addedAt: { gte: sevenDaysAgo } },
  });

  const dailyCounts: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date();
    dayStart.setDate(dayStart.getDate() - i);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    const count = await prisma.wishlistItem.count({
      where: { wishlist: { storeId }, addedAt: { gte: dayStart, lte: dayEnd } },
    });
    dailyCounts.push({
      date: dayStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      count,
    });
  }

  return { totalItems, totalWishlists, totalCustomers: totalCustomers.length, topProducts, recentItems, dailyCounts };
}

export async function getAllWishlists(storeId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [wishlists, total] = await Promise.all([
    prisma.wishlist.findMany({
      where: { storeId },
      include: { items: { orderBy: { addedAt: "desc" }, take: 5 }, _count: { select: { items: true } } },
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.wishlist.count({ where: { storeId } }),
  ]);
  return { wishlists, total, page, totalPages: Math.ceil(total / limit) };
}
export async function getWishlistItemCount(wishlistId: string): Promise<number> {
  return await prisma.wishlistItem.count({
    where: { wishlistId },
  });
}