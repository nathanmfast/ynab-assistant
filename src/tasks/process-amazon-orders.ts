import * as ynab from '../integrations/ynab'
import * as amazonEmailScraper from '../tools/amazon-email-scraper'
import { Database } from '../data/database'

export const go = async function (): Promise<void> {
  console.log('Process Amazon Orders started.')
  await addOrderDetails()
  await processOrders()
  console.log('Process Amazon Orders completed.')
}

const addOrderDetails = async function (): Promise<void> {
  // add orderDetails to any amazonOrders that are missing them
  for (var order of (await Database.AmazonOrdersRepository.GetUnprocessedAmazonOrdersWithMissingDetails())) {
    try{
      const orderDetails = await amazonEmailScraper.getOrderDetails(order.email.text)
      await Database.AmazonOrdersRepository.AddAmazonOrderDetails(order.email.uid, orderDetails.amount, orderDetails.productDescriptions)
    }
    catch(ex){
        console.log('Exception occurred while handling order!');
        console.log('order.email.uid: ', order.email.uid);
        console.log('order.email.subject: ', order.email.subject);
        console.log('ex: ');
        console.log(ex);
    }
  }
  // email scraper needs to be told we're done so it can clean up after itself
  await amazonEmailScraper.done()
}

const processOrders = async function (): Promise<void> {
  // process the orders with good order details
  for (var order of (await Database.AmazonOrdersRepository.GetAmazonOrdersToProcess())) {
    // ynab has a special format for representing amounts so we need to convert to compare (and the amount in ynab is negative)
    var orderYnabAmount = -1 * ynab.utility.getYnabAmount(order.amount)
    // sometimes we use reward points for amazon orders so they don't have a balance and there's no reason to look for them in the unapproved transactions
    if (orderYnabAmount === 0) {
      // mark the amazonOrder as processed
      await Database.AmazonOrdersRepository.MarkAmazonOrderAsProcessed(order.email.uid)
    } else {
      // update memo on YNAB Unapproved Transactions if we have corresponding Amazon orders for them
      var unapprovedTransactions = await ynab.api.getUnapprovedTransactions()
      for (var unapprovedTransaction of unapprovedTransactions) {
        // check if amounts match
        if (orderYnabAmount === unapprovedTransaction.amount) {
          // check if we actually have a product description
          if (order.productDescriptions.length > 0 && !!order.productDescriptions[0] && order.productDescriptions[0].length > 0) {
            // update the transaction memo in YNAB
            const memo = order.productDescriptions.join(', ')
            await ynab.api.setTransactionMemo(unapprovedTransaction, memo)
            // mark the amazonOrder as processed
            await Database.AmazonOrdersRepository.MarkAmazonOrderAsProcessed(order.email.uid)
          }
        }
      }
    }
  }
}
