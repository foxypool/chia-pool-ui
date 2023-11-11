import {compare} from 'compare-versions'
import {VersionInfo} from '../api/types/harvester/harvester'

export interface Client<VersionType> {
  displayName: string
  versionInfoMatching: {
    name: string
    localName?: string
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
  },
  versions: {
    minimum: '1.8.0',
    recommendedMinimum: '2.1.0',
    current: '2.1.0',
    recent: '2.0.0',
    outdated: '1.8.0',
  },
}
export const chiaOgClient: Client<string> = {
  displayName: 'Chia OG',
  versionInfoMatching: {
    name: 'Chia Blockchain',
    localName: 'og',
  },
  versions: {
    minimum: '1.2.0',
    recommendedMinimum: '1.4.0',
  },
}
export const foxyFarmerClient: Client<string> = {
  displayName: 'Foxy-Farmer',
  versionInfoMatching: {
    name: 'Chia Blockchain',
    localName: 'ff',
  },
  versions: {
    minimum: '1.4.0',
    recommendedMinimum: '1.9.1',
  },
}
export const gigahorseClient: Client<number> = {
  displayName: 'Gigahorse',
  versionInfoMatching: {
    name: 'Chia Blockchain',
    localName: 'giga',
  },
  versions: {
    minimum: 10,
    recommendedMinimum: 22,
  },
}
export const fastFarmerClient: Client<string> = {
  displayName: 'Fast Farmer',
  versionInfoMatching: {
    name: 'dg_fast_farmer',
  },
  versions: {
    minimum: '1.0.0',
    recommendedMinimum: '1.0.1',
    current: '1.0.1',
    recent: '1.0.0',
    outdated: '0.0.0',
  },
}
export const liteFarmerClient: Client<string> = {
  displayName: 'Lite Farmer',
  versionInfoMatching: {
    name: 'lite-farmer',
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
  if (clientVersion.clientName === fastFarmerClient.versionInfoMatching.name) {
    return fastFarmerClient
  }  else if (clientVersion.clientName === liteFarmerClient.versionInfoMatching.name) {
    return liteFarmerClient
  } else if (clientVersion.localName1 === foxyFarmerClient.versionInfoMatching.localName || clientVersion.localName2 === foxyFarmerClient.versionInfoMatching.localName || clientVersion.localName3 === foxyFarmerClient.versionInfoMatching.localName) {
    return foxyFarmerClient
  } else if (clientVersion.localName1 === gigahorseClient.versionInfoMatching.localName || clientVersion.localName2 === gigahorseClient.versionInfoMatching.localName || clientVersion.localName3 === gigahorseClient.versionInfoMatching.localName) {
    return gigahorseClient
  }else if (clientVersion.localName1 === chiaOgClient.versionInfoMatching.localName || clientVersion.localName2 === chiaOgClient.versionInfoMatching.localName || clientVersion.localName3 === chiaOgClient.versionInfoMatching.localName) {
    return chiaOgClient
  } else if (clientVersion.clientName === chiaClient.versionInfoMatching.name) {
    return chiaClient
  }
}

export function getGroupedClientForClientVersion(clientVersion: VersionInfo): Client<unknown>|undefined {
  if (clientVersion.clientName === fastFarmerClient.versionInfoMatching.name) {
    return fastFarmerClient
  }  else if (clientVersion.clientName === liteFarmerClient.versionInfoMatching.name) {
    return liteFarmerClient
  } else if (clientVersion.clientName === chiaClient.versionInfoMatching.name) {
    return chiaClient
  }
}

export function getVersionFromClientVersion(client: Client<unknown>, clientVersion: VersionInfo): string|undefined {
  if (client.versionInfoMatching.name !== clientVersion.clientName) {
    return
  }
  if (client.versionInfoMatching.localName === undefined) {
    return clientVersion.clientVersion ?? undefined
  }
  if (clientVersion.localName1 === client.versionInfoMatching.localName) {
    return clientVersion.localVersion1 ?? undefined
  }
  if (clientVersion.localName2 === client.versionInfoMatching.localName) {
    return clientVersion.localVersion2 ?? undefined
  }
  if (clientVersion.localName3 === client.versionInfoMatching.localName) {
    return clientVersion.localVersion3 ?? undefined
  }
}

export enum VersionUpdateInfo {
  noActionRequired,
  updateRecommended,
  updateStronglyRecommended,
}
