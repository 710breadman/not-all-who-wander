import type { TripItem } from "../domain/models";

const rules = [
  { source: ["stove"], needs: ["fuel"] },
  { source: ["flashlight", "headlamp"], needs: ["batter", "charger"] },
  { source: ["tarp"], needs: ["cord", "stake"] },
  { source: ["canned"], needs: ["can opener"] },
  { source: ["coffee"], needs: ["maker", "fuel", "water", "mug"] },
] as const;

export interface DependencyWarning {
  id: string;
  message: string;
}

export function getDependencyWarnings(items: TripItem[]): DependencyWarning[] {
  const included = items.filter((item) => item.status !== "not-needed");
  const contains = (need: string) => included.some((item) => `${item.name} ${item.tags.join(" ")}`.toLocaleLowerCase().includes(need));
  return rules.flatMap((rule) => {
    const source = rule.source.find(contains);
    if (!source) return [];
    const missing = rule.needs.filter((need) => !contains(need));
    return missing.map((need) => ({
      id: `${source}:${need}`,
      message: `${source[0]!.toUpperCase()}${source.slice(1)} is on this checklist; add ${need}.`,
    }));
  });
}

export function itineraryText(
  trip: {
    name: string;
    destination?: string;
    address?: string;
    expectedDeparture?: string;
    expectedReturn?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    vehicleDescription?: string;
    vehiclePlateNote?: string;
    medicalAllergyNote?: string;
    destinationLatitude?: number;
    destinationLongitude?: number;
  },
  fields: readonly string[],
): string {
  const lines = [`Camping itinerary: ${trip.name}`];
  const include = (key: string) => fields.includes(key);
  if (include("schedule")) lines.push(`Expected departure: ${trip.expectedDeparture || "Not set"}`, `Expected return: ${trip.expectedReturn || "Not set"}`);
  if (include("location")) lines.push(`Location: ${[trip.destination, trip.address].filter(Boolean).join(" — ") || "Not set"}`, `Coordinates: ${trip.destinationLatitude === undefined || trip.destinationLongitude === undefined ? "Not set" : `${trip.destinationLatitude}, ${trip.destinationLongitude}`}`);
  if (include("contact")) lines.push(`Emergency contact: ${[trip.emergencyContactName, trip.emergencyContactPhone].filter(Boolean).join(" · ") || "Not set"}`);
  if (include("vehicle")) lines.push(`Vehicle: ${[trip.vehicleDescription, trip.vehiclePlateNote].filter(Boolean).join(" · ") || "Not set"}`);
  return lines.join("\n");
}
