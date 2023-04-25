export interface Harvester {
  _id: string
  peerId: string
  name?: string
  lastAcceptedPartialAt?: string
  versionInfo: VersionInfo
}

interface VersionInfo {
  clientName: string|null
  clientVersion: string|null
  localName1: string|null
  localVersion1: string|null
  localName2: string|null
  localVersion2: string|null
}

export interface RankInfo {
  imageFileName: string
  imageAlt: string
}
