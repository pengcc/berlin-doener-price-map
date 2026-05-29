import { getPriceConfidence, type PriceConfidence } from "../price/confidence";
import type { PriceRecord, Shop } from "../validation/schemas";
import type { DataSet } from "./load-data";

export type LatestPrice = PriceConfidence & {
  id: string;
  shopId: string;
  productType: PriceRecord["productType"];
  observedAt: string;
  priceCents: number;
  sourceType: PriceRecord["sourceType"];
  baseConfidence: number;
  record: PriceRecord;
  shop: Shop;
};

export type LatestPriceOptions = {
  now?: Date;
};

function latestPriceKey(record: PriceRecord) {
  return `${record.shopId}:${record.productType}`;
}

function isNewerRecord(candidate: PriceRecord, current: PriceRecord) {
  if (candidate.observedAt !== current.observedAt) {
    return candidate.observedAt > current.observedAt;
  }

  return candidate.id > current.id;
}

function compareLatestPrices(left: LatestPrice, right: LatestPrice) {
  const shopName = (left.shop.name ?? left.shop.address).localeCompare(
    right.shop.name ?? right.shop.address,
    "de",
  );

  if (shopName !== 0) {
    return shopName;
  }

  const productType = left.productType.localeCompare(right.productType);

  if (productType !== 0) {
    return productType;
  }

  return left.id.localeCompare(right.id);
}

export function getLatestPrices(
  dataSet: DataSet,
  options: LatestPriceOptions = {},
): LatestPrice[] {
  const now = options.now ?? new Date();
  const shopsById = new Map(dataSet.shops.map((shop) => [shop.id, shop]));
  const latestByKey = new Map<string, PriceRecord>();

  for (const record of dataSet.priceRecords) {
    const current = latestByKey.get(latestPriceKey(record));

    if (!current || isNewerRecord(record, current)) {
      latestByKey.set(latestPriceKey(record), record);
    }
  }

  return Array.from(latestByKey.values())
    .flatMap((record) => {
      const shop = shopsById.get(record.shopId);

      if (!shop) {
        return [];
      }

      const confidence = getPriceConfidence(
        record.confidence,
        record.observedAt,
        now,
      );

      return [
        {
          ...confidence,
          id: record.id,
          shopId: record.shopId,
          productType: record.productType,
          observedAt: record.observedAt,
          priceCents: record.priceCents,
          sourceType: record.sourceType,
          baseConfidence: record.confidence,
          record,
          shop,
        },
      ];
    })
    .sort(compareLatestPrices);
}
