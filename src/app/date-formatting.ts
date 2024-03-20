import {Moment} from 'moment'

export enum DateFormatting {
  fixed = 'fixed',
  relative = 'relative',
}

export function formatDate(date: Moment, dateFormatting: DateFormatting): string {
  switch (dateFormatting) {
    case DateFormatting.fixed:
      return date.format('YYYY-MM-DD HH:mm')
    case DateFormatting.relative:
      return date.fromNow()
  }
}
