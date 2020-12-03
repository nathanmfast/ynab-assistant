import * as ynab from '../integrations/ynab'
import * as chaseEmailScraper from '../tools/chase-email-scraper'
import { parseISO, compareAsc, subDays, differenceInDays } from 'date-fns'
import { TransactionDetail } from 'ynab'
import { Database } from '../data/database'
import { Transaction } from '../data/models/transaction'

export const go = async function (): Promise<void> {
  console.log('Process Chase Transactions started.')
  await addTransactionDetails()
  await processTransactions()
  console.log('Process Chase Transactions completed.')
}

const addTransactionDetails = async function (): Promise<void> {
  // add transactionDetails to any chaseTransactions that are missing them
  for (var transaction of (await Database.TransactionsRepository.GetUnprocessedTransactionsWithMissingDetails())) {
    const transactionDetails = chaseEmailScraper.getTransactionDetails(transaction.email.text)
    await Database.TransactionsRepository.AddTransactionDetails(transaction.email.uid, transactionDetails.amount, transactionDetails.payeeName, transactionDetails.date)
  }
}

const processTransactions = async function (): Promise<void> {
  // process the transactions with good transaction details
  var transactions = await Database.TransactionsRepository.GetTransactionsToProcess()
  if (transactions.length > 0) {
    // figure out the oldest date we have in the list of transactions to proces
    var oldestDateToProcess = transactions.map((x:Transaction) => { return x.date }).sort(compareAsc).shift()
    // query ynab for all transactions since that date (minus a day so we don't have to worry about edge cases)
    const ynabTransactions = await ynab.api.getTransactionsSinceDate(subDays(oldestDateToProcess, 1))
    for (var transaction of transactions) {
      // ynab has a special format for representing amounts so we need to convert to compare
      var transactionYnabAmount = ynab.utility.getYnabAmount(transaction.amount)
      // amount should be non-zero or we don't care
      if (transactionYnabAmount !== 0) {
        // see if this transaction already exists in YNAB
        if (!ynabTransactions.some((ynabTransaction: TransactionDetail) => {
          return ynabTransaction.amount === transactionYnabAmount &&
                            Math.abs(differenceInDays(parseISO(ynabTransaction.date), transaction.date)) === 0
        })) {
          // create the transaction in YNAB
          var flagColor = transaction.payeeName.toLowerCase().includes('amazon') || transaction.payeeName.toLowerCase().includes('amzn') ? TransactionDetail.FlagColorEnum.Blue : TransactionDetail.FlagColorEnum.Green
          await ynab.api.createTransaction(transaction.payeeName, transactionYnabAmount, transaction.date.toISOString(), flagColor)
        }
      }
      // mark our record as processed
      await Database.TransactionsRepository.SetTransactionProcessed(transaction.email.uid)
    }
  }
}
