import {CustomStepDefinition} from '@angular-slider/ngx-slider/options'

export const stepsArray: CustomStepDefinition[] = [{
  value: 10,
  legend: '10m',
}, {
  value: 20,
  legend: '20m',
}, {
  value: 30,
  legend: '30m',
}, {
  value: 60,
  legend: '1h',
}, {
  value: 2 * 60,
  legend: '2h',
}, {
  value: 4 * 60,
  legend: '4h',
}, {
  value: 8 * 60,
  legend: '8h',
}, {
  value: 16 * 60,
  legend: '16h',
}, {
  value: 24 * 60,
  legend: '24h',
}]
