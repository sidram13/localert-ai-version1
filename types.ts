
export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface CommuteHistoryEntry {
  id: string;
  destinationName: string;
  destinationCoords: Coordinates;
  timestamp: number;
}
