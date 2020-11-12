import { Database } from '../data/database'
import { AmazonOrder } from '../data/models/amazon-order'

const main = async function () {
  const orders = await Database.AmazonOrdersRepository.GetUnprocessedAmazonOrders()

  console.log('orders:', orders.map((x: AmazonOrder) => {
    return {
      ...x,
      email: {
        ...x.email,
        text: '--ommitted--'
      }
    }
  }))
  const transactions = await Database.TransactionsRepository.GetUnprocessedTransactions()
  console.log('transactions:', transactions)
}
main()
