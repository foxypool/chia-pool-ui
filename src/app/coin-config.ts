const config = {
  CHIA: {
    cliCommandPrefix: 'chia',
    hdKeyPoolPublicKeyPath: 'm/12381/8444/1/0',
  },
  FLAX: {
    cliCommandPrefix: 'flax',
    hdKeyPoolPublicKeyPath: 'm/12381/8444/1/0',
  },
  CHIVES: {
    cliCommandPrefix: 'chives',
    hdKeyPoolPublicKeyPath: 'm/12381/9699/1/0',
  },
  HDDCOIN: {
    cliCommandPrefix: 'hddcoin',
    hdKeyPoolPublicKeyPath: 'm/12381/8444/1/0',
  },
  STAI: {
    cliCommandPrefix: 'staicoin',
    hdKeyPoolPublicKeyPath: 'm/12381/8444/1/0',
  },
};

export function configForCoin(coin) {
  return config[coin];
}
