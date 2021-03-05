import * as minimist from 'minimist'
import * as emailListener from './integrations/email-listener'
import * as ynab from './integrations/ynab'
import * as chaseTransactionsProcessor from './tasks/process-chase-transactions'
import * as amazonOrdersProcessor from './tasks/process-amazon-orders'
import * as autoCategorizeTransactions from './tasks/auto-categorize-transactions'
import { differenceInMinutes } from 'date-fns'
import AwaitLock from 'await-lock'

var opts = {
  boolean: [
    'processChaseTransactions',
    'processAmazonOrders',
    'autoCategorizeTransactions',
    'emailStartDate',
    'loop'
  ],
  alias: {
    chase: 'processChaseTransactions',
    amazon: 'processAmazonOrders',
    categories: 'autoCategorizeTransactions'
  }
}
var args = minimist(process.argv.slice(2), opts)

const taskRunnerLock = new AwaitLock()
const runTasks = async function () {
  await taskRunnerLock.acquireAsync()
  try {
    // execute all the tasks
    if (args.processChaseTransactions) {
      await chaseTransactionsProcessor.go()
    }
    if (args.processAmazonOrders) {
      await amazonOrdersProcessor.go()
    }
    if (args.autoCategorizeTransactions) {
      await autoCategorizeTransactions.go()
    }
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
    emailListener.listen(runTasks)
  }

  // run processing (can't hurt, might pick something up or help with error recovery)
  runTasks()

  // reconnect to imap server if necessary
  emailListener.reconnectIfNecessary()

  // check every fifteen minutes (and a little extra to be certain the date difference is correct)
  if (args.loop) {
    setTimeout(loop, (15 * 60 * 1000) + 1000)
  }
}

loop()
