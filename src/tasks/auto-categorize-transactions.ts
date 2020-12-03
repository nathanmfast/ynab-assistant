import * as ynab from '../integrations/ynab'
import { TransactionDetail } from 'ynab'

interface IRule{
  payeeName: string,
  categoryName: string,
  amount?: number
}

require('hjson/lib/require-config')
const rules: IRule[] = require('../../rules.hjson')

for (const rule of rules) {
  rule.payeeName = rule.payeeName.toLowerCase()
}

const autoCategorizeTransaction = function (transaction: TransactionDetail): void {
  console.log('Started auto-categorization for transaction_id: ' + transaction.id + ', payee_name: ' + transaction.payee_name)
  const matchingRule = ynab.utility.reverseFuzzySearch(rules, 'payeeName', transaction.payee_name.toLowerCase())
  if (matchingRule) {
    const category = ynab.utility.fuzzySearch(ynab.data.categories, 'name', matchingRule.categoryName)
    if (!category) {
      alert('Failed to lookup category with name: "' + matchingRule.categoryName + '"')
      return
    }
    ynab.api.setTransactionCategory(transaction, category)
  } else {
    console.log('No categorization rules were found to apply to this transaction.')
  }
}

const autoCategorizeTransactions = async function (): Promise<void> {
  const unapprovedTransactions = await ynab.api.getUnapprovedTransactions()
  for (var unapprovedTransaction of unapprovedTransactions) {
    autoCategorizeTransaction(unapprovedTransaction)
  }
}

export const go = async function (): Promise<void> {
  console.log('Auto-Categorize Transactions started.')
  await autoCategorizeTransactions()
  console.log('Auto-Categorize Transactions completed.')
}
