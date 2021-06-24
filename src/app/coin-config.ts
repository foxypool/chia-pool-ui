const config = {
  CHIA: {
    clientSoftwareDownloadUrl: 'https://github.com/felixbrucker/chia-blockchain',
    clientSoftwareName: 'chia-blockchain',
    cliCommandPrefix: 'chia',
  },
  FLAX: {
    clientSoftwareDownloadUrl: 'https://github.com/felixbrucker/flax-blockchain',
    clientSoftwareName: 'flax-blockchain',
    cliCommandPrefix: 'flax',
  },
};

export function configForCoin(coin) {
  return config[coin];
}
