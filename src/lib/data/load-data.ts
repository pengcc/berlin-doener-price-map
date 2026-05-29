import type { District, PriceRecord, Shop } from "../validation/schemas";
import { loadDistricts } from "./load-districts";
import { loadPriceRecords } from "./load-price-records";
import { loadShops } from "./load-shops";

export type DataSet = {
  shops: Shop[];
  priceRecords: PriceRecord[];
  districts: District[];
};

export function loadDataSet(dataDirectory?: string): DataSet {
  return {
    shops: loadShops(dataDirectory),
    priceRecords: loadPriceRecords(dataDirectory),
    districts: loadDistricts(dataDirectory),
  };
}
