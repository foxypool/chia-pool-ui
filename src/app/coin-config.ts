const config = {
  CHIA: {
    cliCommandPrefix: 'chia',
    hdKeyPoolPublicKeyPath: 'm/12381/8444/1/0',
    decimalPlaces: 12,
  },
  FLAX: {
    cliCommandPrefix: 'flax',
    hdKeyPoolPublicKeyPath: 'm/12381/8444/1/0',
    decimalPlaces: 12,
  },
  CHIVES: {
    cliCommandPrefix: 'chives',
    hdKeyPoolPublicKeyPath: 'm/12381/9699/1/0',
    decimalPlaces: 8,
  },
  HDDCOIN: {
    cliCommandPrefix: 'hddcoin',
    hdKeyPoolPublicKeyPath: 'm/12381/8444/1/0',
    decimalPlaces: 12,
  },
  STAI: {
    cliCommandPrefix: 'staicoin',
    hdKeyPoolPublicKeyPath: 'm/12381/8444/1/0',
    decimalPlaces: 9,
  },
};

export function configForCoin(coin) {
  return config[coin];
}
