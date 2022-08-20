const config = {
  CHIA: {
    cliCommandPrefix: 'chia',
    hdKeyPoolPublicKeyPath: 'm/12381n/8444n/1n/0n',
    decimalPlaces: 12,
  },
  CHIVES: {
    cliCommandPrefix: 'chives',
    hdKeyPoolPublicKeyPath: 'm/12381n/9699n/1n/0n',
    decimalPlaces: 8,
  },
};

export function configForCoin(coin) {
  return config[coin];
}
