const config = {
  CHIA: {
    cliCommandPrefix: 'chia',
    hdKeyPoolPublicKeyPath: 'm/12381n/8444n/1n/0n',
    decimalPlaces: 12,
  },
};

export interface CoinConfig {
  cliCommandPrefix: string
  hdKeyPoolPublicKeyPath: string
  decimalPlaces: number
}

export function configForCoin(coin: string): CoinConfig {
  return config[coin]
}
