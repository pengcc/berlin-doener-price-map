import type { DataSet } from "../data/load-data";
import type { PriceRecord } from "./schemas";

export type ValidationSeverity = "error" | "warning";

export type ValidationMessage = {
  severity: ValidationSeverity;
  code: string;
  path: string;
  message: string;
};

export type ValidationResult = {
  errors: ValidationMessage[];
  warnings: ValidationMessage[];
};

const OUTDATED_DAYS = 180;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

function toUtcDateOnly(value: Date) {
  return Date.UTC(
    value.getUTCFullYear(),
    value.getUTCMonth(),
    value.getUTCDate(),
  );
}

function observedAtToUtcDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function ageInDays(record: PriceRecord, now: Date) {
  return Math.floor(
    (toUtcDateOnly(now) - observedAtToUtcDate(record.observedAt)) /
      MILLISECONDS_PER_DAY,
  );
}

function pushDuplicateIdMessages(
  ids: string[],
  path: string,
  errors: ValidationMessage[],
) {
  const seen = new Set<string>();
  const duplicateIds = new Set<string>();

  for (const id of ids) {
    if (seen.has(id)) {
      duplicateIds.add(id);
    }
    seen.add(id);
  }

  for (const id of duplicateIds) {
    errors.push({
      severity: "error",
      code: "duplicate_id",
      path,
      message: `Duplicate id "${id}"`,
    });
  }
}

export function validateDataSet(
  dataSet: DataSet,
  now = new Date(),
): ValidationResult {
  const errors: ValidationMessage[] = [];
  const warnings: ValidationMessage[] = [];

  pushDuplicateIdMessages(
    dataSet.shops.map((shop) => shop.id),
    "shops",
    errors,
  );
  pushDuplicateIdMessages(
    dataSet.priceRecords.map((record) => record.id),
    "priceRecords",
    errors,
  );
  pushDuplicateIdMessages(
    dataSet.districts.map((district) => district.id),
    "districts",
    errors,
  );

  const shopIds = new Set(dataSet.shops.map((shop) => shop.id));

  dataSet.shops.forEach((shop, index) => {
    if (!shop.name) {
      warnings.push({
        severity: "warning",
        code: "missing_shop_name",
        path: `shops[${index}].name`,
        message: `Shop "${shop.id}" has no public name`,
      });
    }
  });

  dataSet.priceRecords.forEach((record, index) => {
    if (!shopIds.has(record.shopId)) {
      errors.push({
        severity: "error",
        code: "missing_shop_reference",
        path: `priceRecords[${index}].shopId`,
        message: `Price record "${record.id}" references unknown shop "${record.shopId}"`,
      });
    }

    const ageDays = ageInDays(record, now);

    if (ageDays < 0) {
      warnings.push({
        severity: "warning",
        code: "future_observed_at",
        path: `priceRecords[${index}].observedAt`,
        message: `Price record "${record.id}" is dated in the future`,
      });
    } else if (ageDays > OUTDATED_DAYS) {
      warnings.push({
        severity: "warning",
        code: "outdated_price",
        path: `priceRecords[${index}].observedAt`,
        message: `Price record "${record.id}" is older than ${OUTDATED_DAYS} days`,
      });
    }
  });

  return { errors, warnings };
}
