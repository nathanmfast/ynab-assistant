import * as amazonOrderDetailsScraper from './amazon-order-details-scraper'

const separator = '\r\n'

const getOrderTotal = function (text: string): number {
  const orderTotalStartsWith = 'Order Total: $'
  var orderTotalLine = text.split(separator).find((x) => {
    return x.indexOf(orderTotalStartsWith) > 0
  })
  var orderTotalStartIndex = orderTotalLine.indexOf(orderTotalStartsWith) + orderTotalStartsWith.length
  var orderTotalEndIndex = orderTotalLine.length
  var amount = parseFloat(orderTotalLine.substring(orderTotalStartIndex, orderTotalEndIndex))
  return amount
}

const getOrderUrl = function (text: string): string {
  const orderUrlLineContains = 'amazon.com/gp/css/order-details'
  var orderUrlLine = text.split(separator).find((x) => {
    return x.includes(orderUrlLineContains)
  })
  var orderUrl = orderUrlLine
  return orderUrl
}

const getProductDescriptions = async function (text: string): Promise<string[]> {
  let orderUrl = getOrderUrl(text)
  if(!orderUrl){
    throw 'Order URL not found!'
  }
  return amazonOrderDetailsScraper.getProductDetailsFromOrderUrl(orderUrl)
}

export interface OrderDetails{
    amount: number,
    productDescriptions: string[]
}

export const getOrderDetails = async function (text: string): Promise<OrderDetails> {
  return {
    amount: getOrderTotal(text),
    productDescriptions: await getProductDescriptions(text)
  }
}

export const done = async function (): Promise<void> {
  await amazonOrderDetailsScraper.close()
}
