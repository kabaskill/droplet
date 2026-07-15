import type { Region } from "@/services/types"

export type WaterSystem = {
  id: string
  name: string
  stateIds: string[]
}

export const waterSystems: WaterSystem[] = [
  {
    id: "rhine",
    name: "Rhine",
    stateIds: [
      "baden-wurttemberg",
      "hesse",
      "north-rhine-westphalia",
      "rhineland-palatinate",
      "saarland",
    ],
  },
  {
    id: "main",
    name: "Main",
    stateIds: ["baden-wurttemberg", "bavaria", "hesse"],
  },
  {
    id: "danube",
    name: "Danube",
    stateIds: ["baden-wurttemberg", "bavaria"],
  },
  {
    id: "elbe",
    name: "Elbe",
    stateIds: [
      "berlin",
      "brandenburg",
      "hamburg",
      "saxony",
      "saxony-anhalt",
      "schleswig-holstein",
      "thuringia",
    ],
  },
  {
    id: "weser",
    name: "Weser",
    stateIds: [
      "bremen",
      "hesse",
      "lower-saxony",
      "north-rhine-westphalia",
      "saxony-anhalt",
      "thuringia",
    ],
  },
  {
    id: "oder",
    name: "Oder",
    stateIds: ["berlin", "brandenburg", "mecklenburg-vorpommern", "saxony"],
  },
  {
    id: "spree",
    name: "Spree",
    stateIds: ["berlin", "brandenburg", "saxony"],
  },
  {
    id: "saale",
    name: "Saale",
    stateIds: ["bavaria", "saxony-anhalt", "thuringia"],
  },
  {
    id: "saar",
    name: "Saar",
    stateIds: ["rhineland-palatinate", "saarland"],
  },
  {
    id: "warnow",
    name: "Warnow",
    stateIds: ["mecklenburg-vorpommern"],
  },
]

function waterSystemStateCount(system: WaterSystem, regions: Region[]) {
  const regionIds = new Set(regions.map((region) => region.id))

  return system.stateIds.filter((stateId) => regionIds.has(stateId)).length
}

function regionBelongsToWaterSystem(
  region: Region,
  system: WaterSystem | null
) {
  return !system || system.stateIds.includes(region.id)
}
