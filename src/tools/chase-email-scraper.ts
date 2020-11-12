import { parse } from 'date-fns'

const separator = '\r\n'

export interface TransactionDetails{
  amount: number,
  payeeName: string,
  date: Date
}

export const getTransactionDetails = function (text: string): TransactionDetails {
  const text1 = 'A charge of ($USD) '
  const text2 = ' at '
  const text3 = ' has been authorized on '
  const text4 = '.'
  var moneyShot = text.split(separator).find(function (x: string) {
    return x.startsWith(text1)
  })
  var amountStartIndex = text1.length
  var amountEndIndex = moneyShot.indexOf(text2, amountStartIndex)
  var amountText = moneyShot.substring(amountStartIndex, amountEndIndex)
  var amount = parseFloat(amountText) * -1.0
  var payeeNameStartIndex = moneyShot.indexOf(text2, amountEndIndex) + text2.length
  var payeeNameEndIndex = moneyShot.indexOf(text3, payeeNameStartIndex)
  var payeeName = moneyShot.substring(payeeNameStartIndex, payeeNameEndIndex)
  var dateStartIndex = moneyShot.indexOf(text3, payeeNameEndIndex) + text3.length
  var dateEndIndex = moneyShot.indexOf(text4, dateStartIndex)
  var dateString = moneyShot.substring(dateStartIndex, dateEndIndex)
  // parse the date portion (before the ' at ') only and format as ISO 8601
  var date = parse(dateString.split(' at ')[0], 'LLL dd, yyyy', new Date())
  // this would parse it with the time (at least sort of, Chase's formatting here is quite ambiguous) but it could be fragile
  // if matching the dates doesn't work well enough without the time component, this could prove useful
  // var date = parse(dateString.replace(' at ', ' ').replace(' ET', ' -06'), 'LLL dd, yyyy p X', new Date())
  return {
    amount: amount,
    payeeName: payeeName,
    date: date
  }
}
