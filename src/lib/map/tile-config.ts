export type MapTileConfig =
  | {
      attribution: string;
      maxZoom: number;
      provider: "maptiler" | "osm";
      status: "available";
      url: string;
    }
  | {
      provider: "none";
      reason: "missing-maptiler-key";
      status: "unavailable";
    };

export function getMapTileConfig({
  mapTilerKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY,
  nodeEnv = process.env.NODE_ENV,
}: {
  mapTilerKey?: string;
  nodeEnv?: string;
} = {}): MapTileConfig {
  if (mapTilerKey) {
    return {
      attribution:
        '<a href="https://www.maptiler.com/copyright/" target="_blank" rel="noreferrer">MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>',
      maxZoom: 19,
      provider: "maptiler",
      status: "available",
      url: `https://api.maptiler.com/maps/streets-v4/{z}/{x}/{y}.png?key=${mapTilerKey}`,
    };
  }

  if (nodeEnv !== "production") {
    return {
      attribution:
        '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>',
      maxZoom: 19,
      provider: "osm",
      status: "available",
      url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    };
  }

  return {
    provider: "none",
    reason: "missing-maptiler-key",
    status: "unavailable",
  };
}
