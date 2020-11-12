import * as emailListener from './integrations/email-listener'
import * as ynab from './integrations/ynab'
import * as chaseTransactionsProcessor from './tasks/process-chase-transactions'
import * as amazonOrdersProcessor from './tasks/process-amazon-orders'
import * as autoCategorizeTransactions from './tasks/auto-categorize-transactions'
import { differenceInMinutes } from 'date-fns'
import AwaitLock from 'await-lock'

const taskRunnerLock = new AwaitLock()
const process = async function () {
  await taskRunnerLock.acquireAsync()
  try {
    // execute all the tasks
    await chaseTransactionsProcessor.go()
    await amazonOrdersProcessor.go()
    await autoCategorizeTransactions.go()
  } finally {
    taskRunnerLock.release()
  }
}

let lastYnabPopulateDataDate:Date

const loop = async function () {
  console.log('emailListener.state: ', emailListener.state())

  // refresh the ynab data if its been more than 15 minutes
  if (lastYnabPopulateDataDate === undefined || differenceInMinutes(new Date(), lastYnabPopulateDataDate) > 15) {
    lastYnabPopulateDataDate = new Date()
    await ynab.populateData()
  }

  if (emailListener.state() === 'not listening') {
    // get emails / listen for emails
    emailListener.listen(process)
  }

  // run processing (can't hurt, might pick something up or help with error recovery)
  process()

  // reconnect to imap server if necessary
  emailListener.reconnectIfNecessary()

  // check every fifteen minutes (and a little extra to be certain the date difference is correct)
  setTimeout(loop, (15 * 60 * 1000) + 1000)
}

loop()
