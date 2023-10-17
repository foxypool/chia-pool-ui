export const clientVersions = {
  chia: {
    minimum: '1.8.0',
    recommendedMinimum: '2.0.0',
    current: '2.0.0',
    recent: '1.8.0',
    outdated: '1.7.0',
  },
  og: {
    minimum: '1.2.0',
    recommendedMinimum: '1.4.0',
  },
  foxyFarmer: {
    minimum: '1.4.0',
    recommendedMinimum: '1.9.1',
  },
  gigahorse: {
    minimum: 10,
    recommendedMinimum: 14,
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
