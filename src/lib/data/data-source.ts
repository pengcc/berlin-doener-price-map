import { type DataSet, loadDataSet } from "./load-data";

export const PRODUCTION_DATA_DIRECTORY = "data";
export const DEMO_DATA_DIRECTORY = "data/demo";

export type DataMode = "production" | "demo";

export type LoadedAppDataSet = {
  dataDirectory: string;
  dataSet: DataSet;
  mode: DataMode;
};

export function getDataMode(
  value = process.env.BERLIN_DOENER_DATA_MODE,
): DataMode {
  return value === "demo" ? "demo" : "production";
}

export function getDataDirectoryForMode(mode: DataMode) {
  return mode === "demo" ? DEMO_DATA_DIRECTORY : PRODUCTION_DATA_DIRECTORY;
}

export function getPathForDataMode(href: string, mode: DataMode) {
  if (mode === "production") {
    return href;
  }

  return href === "/" ? "/demo" : `/demo${href}`;
}

export function loadAppDataSet(mode = getDataMode()): LoadedAppDataSet {
  const dataDirectory = getDataDirectoryForMode(mode);

  return {
    dataDirectory,
    dataSet: loadDataSet(dataDirectory),
    mode,
  };
}
