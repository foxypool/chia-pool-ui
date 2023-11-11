export const clientVersions = {
  chia: {
    minimum: '1.8.0',
    recommendedMinimum: '2.1.0',
    current: '2.1.0',
    recent: '2.0.0',
    outdated: '1.8.0',
  },
  og: {
    minimum: '1.2.0',
    recommendedMinimum: '1.4.0',
  },
  foxyFarmer: {
    minimum: '1.4.0',
    recommendedMinimum: '1.9.1',
  },
  fastFarmer: {
    minimum: '1.0.0',
    recommendedMinimum: '1.0.1',
    current: '1.0.1',
    recent: '1.0.0',
    outdated: '0.0.0',
  },
  gigahorse: {
    minimum: 10,
    recommendedMinimum: 20,
  },
  chiaCompressionAlpha: {
    minimum: '4.3',
    recommendedMinimum: '4.3',
  },
}

export enum VersionUpdateInfo {
  noActionRequired,
  updateRecommended,
  updateStronglyRecommended,
}
