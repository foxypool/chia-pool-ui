const config = {
  CHIA: {
    cliCommandPrefix: 'chia',
    hdKeyPoolPublicKeyPath: 'm/12381n/8444n/1n/0n',
    decimalPlaces: 12,
  },
  FLAX: {
    cliCommandPrefix: 'flax',
    hdKeyPoolPublicKeyPath: 'm/12381n/8444n/1n/0n',
    decimalPlaces: 12,
  },
  CHIVES: {
    cliCommandPrefix: 'chives',
    hdKeyPoolPublicKeyPath: 'm/12381n/9699n/1n/0n',
    decimalPlaces: 8,
  },
  HDDCOIN: {
    cliCommandPrefix: 'hddcoin',
    hdKeyPoolPublicKeyPath: 'm/12381/8444/1/0',
    decimalPlaces: 12,
  },
  STAI: {
    cliCommandPrefix: 'stai',
    hdKeyPoolPublicKeyPath: 'm/12381n/8444n/1n/0n',
    decimalPlaces: 9,
  },
};

export function configForCoin(coin) {
  return config[coin];
}
