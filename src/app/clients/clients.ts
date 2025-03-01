import {compare} from 'compare-versions'
import {VersionInfo} from '../api/types/harvester/harvester'

export interface Client<VersionType> {
  displayName: string
  versionInfoMatching: {
    name: string
    localNames: string[]
  }
  versions: {
    minimum: VersionType,
    recommendedMinimum: VersionType,
    current?: VersionType,
    recent?: VersionType,
    outdated?: VersionType,
  }
}

export const chiaClient: Client<string> = {
  displayName: 'Chia',
  versionInfoMatching: {
    name: 'Chia Blockchain',
    localNames: [],
  },
  versions: {
    minimum: '2.5.1',
    recommendedMinimum: '2.5.1',
    current: '2.5.1',
    recent: '2.5.0',
    outdated: '2.4.0',
  },
}
export const chiaOgClient: Client<string> = {
  displayName: 'Chia OG',
  versionInfoMatching: {
    name: 'Chia Blockchain',
    localNames: ['og'],
  },
  versions: {
    minimum: '1.2.0',
    recommendedMinimum: '1.6.0',
  },
}
export const drPlotterClient: Client<string> = {
  displayName: 'DrPlotter',
  versionInfoMatching: {
    name: 'Chia Blockchain',
    localNames: ['dr'],
  },
  versions: {
    minimum: '0.11.0',
    recommendedMinimum: '0.12.0',
  },
}
export const foxyFarmerClientWithBB: Client<string> = {
  displayName: 'Foxy-Farmer (BB)',
  versionInfoMatching: {
    name: 'Chia Blockchain',
    localNames: ['ff', 'og'],
  },
  versions: {
    minimum: '1.8.0',
    recommendedMinimum: '1.22.5',
  },
}
export const foxyFarmerClientWithGH: Client<string> = {
  displayName: 'Foxy-Farmer (GH)',
  versionInfoMatching: {
    name: 'Chia Blockchain',
    localNames: ['ff', 'giga'],
  },
  versions: {
    minimum: '1.22.4',
    recommendedMinimum: '1.22.5',
  },
}
export const foxyFarmerClientWithDR: Client<string> = {
  displayName: 'Foxy-Farmer (DR)',
  versionInfoMatching: {
    name: 'Chia Blockchain',
    localNames: ['ff', 'og', 'dr'],
  },
  versions: {
    minimum: '1.22.1',
    recommendedMinimum: '1.22.5',
  },
}
export const foxyGhFarmerClient: Client<string> = {
  displayName: 'Foxy-GH-Farmer',
  versionInfoMatching: {
    name: 'Chia Blockchain',
    localNames: ['foxy-gh-farmer'],
  },
  versions: {
    minimum: '1.10.1',
    recommendedMinimum: '1.10.1',
  },
}
export const gigahorseClient: Client<number> = {
  displayName: 'Gigahorse',
  versionInfoMatching: {
    name: 'Chia Blockchain',
    localNames: ['giga'],
  },
  versions: {
    minimum: 22,
    recommendedMinimum: 36,
  },
}
export const fastFarmerClient: Client<string> = {
  displayName: 'Fast Farmer',
  versionInfoMatching: {
    name: 'dg_fast_farmer',
    localNames: [],
  },
  versions: {
    minimum: '1.0.0',
    recommendedMinimum: '1.0.1',
    current: '1.0.1',
    recent: '1.0.0',
    outdated: '0.0.0',
  },
}
export const gigahorseFastFarmerClient: Client<string> = {
  displayName: 'Fast Farmer (GH)',
  versionInfoMatching: {
    name: 'gh_fast_farmer',
    localNames: [],
  },
  versions: {
    minimum: '1.0.1',
    recommendedMinimum: '1.0.2',
    current: '1.0.4',
    recent: '1.0.2',
    outdated: '1.0.0',
  },
}
export const liteFarmerClient: Client<string> = {
  displayName: 'Lite Farmer',
  versionInfoMatching: {
    name: 'lite-farmer',
    localNames: [],
  },
  versions: {
    minimum: '1.0.0',
    recommendedMinimum: '1.0.0',
    current: '1.0.0',
    recent: '0.0.0',
    outdated: '0.0.0',
  },
}

export function getSemverVersionUpdateInfo(client: Client<string>, version?: string): VersionUpdateInfo {
  if (version === undefined) {
    return VersionUpdateInfo.noActionRequired
  }
  if (compare(version, client.versions.recommendedMinimum, '>=')) {
    return VersionUpdateInfo.noActionRequired
  }
  if (compare(version, client.versions.minimum, '>=')) {
    return VersionUpdateInfo.updateRecommended
  }

  return VersionUpdateInfo.updateStronglyRecommended
}

export function getIntegerVersionUpdateInfo(client: Client<number>, version?: string): VersionUpdateInfo {
  if (version === undefined) {
    return VersionUpdateInfo.noActionRequired
  }
  const versionNumber = parseInt(version, 10)
  if (isNaN(versionNumber)) {
    return VersionUpdateInfo.noActionRequired
  }
  if (versionNumber >= client.versions.recommendedMinimum) {
    return VersionUpdateInfo.noActionRequired
  }
  if (versionNumber >= client.versions.minimum) {
    return VersionUpdateInfo.updateRecommended
  }

  return VersionUpdateInfo.updateStronglyRecommended
}

export function getClientForClientVersion(clientVersion: VersionInfo): Client<unknown>|undefined {
  const localNames = [clientVersion.localName1, clientVersion.localName2, clientVersion.localName3]
  const clients = [
    fastFarmerClient,
    gigahorseFastFarmerClient,
    liteFarmerClient,
    foxyFarmerClientWithDR,
    foxyFarmerClientWithBB,
    foxyFarmerClientWithGH,
    foxyGhFarmerClient,
    gigahorseClient,
    drPlotterClient,
    chiaOgClient,
  ]
  for (const client of clients) {
    if (client.versionInfoMatching.name === clientVersion.clientName && client.versionInfoMatching.localNames.every(localName => localNames.some(curr => curr === localName))) {
      return client
    }
  }

  // Catch all for chia clients with no or unknown local names
  if (clientVersion.clientName === chiaClient.versionInfoMatching.name) {
    return chiaClient
  }
}

export function getGroupedClientForClientVersion(clientVersion: VersionInfo): Client<unknown>|undefined {
  const clients = [
    fastFarmerClient,
    gigahorseFastFarmerClient,
    liteFarmerClient,
    chiaClient,
  ]
  for (const client of clients) {
    if (clientVersion.clientName === client.versionInfoMatching.name) {
      return client
    }
  }
}

export function getVersionFromClientVersion(client: Client<unknown>, clientVersion: VersionInfo): string|undefined {
  if (client.versionInfoMatching.name !== clientVersion.clientName) {
    return
  }
  if (client.versionInfoMatching.localNames.length === 0) {
    return clientVersion.clientVersion ?? undefined
  }
  const localNameForVersion = client.versionInfoMatching.localNames[0]
  if (clientVersion.localName1 === localNameForVersion) {
    return clientVersion.localVersion1 ?? undefined
  }
  if (clientVersion.localName2 === localNameForVersion) {
    return clientVersion.localVersion2 ?? undefined
  }
  if (clientVersion.localName3 === localNameForVersion) {
    return clientVersion.localVersion3 ?? undefined
  }
}

export enum VersionUpdateInfo {
  noActionRequired,
  updateRecommended,
  updateStronglyRecommended,
}
