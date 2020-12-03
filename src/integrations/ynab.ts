/*
    YNAB
    The sole purpose of this module is to allow for even easier interaction with the YNAB API.

    It should:
    - know how to connect to ynab api with the right credentials for your account
    - be able to retrieve data from ynab and present it in a way that is useful for the application
    - update transactions in ynab
    - provide utility functions for working with ynab data formats

    It shouldn't:
    - contain any logic for what the application will do with the data
*/

import * as ynab from 'ynab'
import { TransactionDetail } from 'ynab'
import { YNAB_PERSONAL_ACCESS_TOKEN } from '../config/env'

/* eslint-disable new-cap */
const ynabApi = new ynab.api(YNAB_PERSONAL_ACCESS_TOKEN)

export interface FlatCategory extends ynab.Category {
  /* eslint-disable camelcase */
  category_group_name: string;
}

export const data: {
    budget: ynab.BudgetSummary;
    accounts: ynab.Account[];
    categories: FlatCategory[];
  } = {
    budget: undefined,
    accounts: [],
    categories: []
  }

const getKeyValue = function<T extends object, U extends keyof T> (obj: T, key: U) { return obj[key] }

export const utility = {
  getYnabAmount: function (amount: number): number {
    return amount * 1000
  },
  reverseFuzzySearch: function<T extends {[key: string]: any}> (data: Array<T>, propertyName: string, searchTerm: string): T {
    const matching = data.filter(x => searchTerm.includes(getKeyValue(x, propertyName)))
    if (!matching || matching.length === 0) {
      return undefined
    }
    let longestMatching = matching[0]
    matching.forEach(x => {
      if (x[propertyName].length > longestMatching[propertyName].length) {
        longestMatching = x
      }
    })
    return longestMatching
  },
  fuzzySearch: function<T extends {[key: string]: any}> (data: Array<T>, propertyName: string, searchTerm: string): T {
    const matching = data.filter(x => (getKeyValue(x, propertyName)).includes(searchTerm))
    if (!matching || matching.length === 0) {
      return undefined
    }
    let shortestMatching = matching[0]
    matching.forEach(x => {
      if (x[propertyName].length < shortestMatching[propertyName].length) {
        shortestMatching = x
      }
    })
    return shortestMatching
  }
}

namespace ynabApiHelper {
  export interface getTransactionsArgs{
    budget_id: string,
    since_date?: Date | string,
    type?: 'uncategorized' | 'unapproved',
    last_knowledge_of_server?: number,
    options?: any
  }
  export interface createTransactionArgs{
    budget_id: string,
    data: ynab.SaveTransactionsWrapper,
    options?: any
  }
  export interface updateTransactionArgs{
    budget_id: string,
    transaction_id: string,
    data: ynab.SaveTransactionWrapper,
    options?: any
  }
}

export const api = {
  getBudgets: async function () {
    const results = (await ynabApi.budgets.getBudgets()).data.budgets
    // console.log('ynab.api.getBudgets, results: ', results)
    return results
  },
  getAccounts: async function () {
    const results: ynab.Account[] = (await ynabApi.accounts.getAccounts(data.budget.id)).data.accounts
    // console.log('ynab.api.getAccounts, results: ', results)
    return results
  },
  getCategories: async function (): Promise<Array<FlatCategory>> {
    // get categories but reduce/map so we have a flat list and don't have to crawl through groups all the time
    const results = (await ynabApi.categories.getCategories(data.budget.id)).data.category_groups.reduce(function (categories, category_group) {
      return categories.concat(category_group.categories.map(function (category) {
        const flatCategory = category as FlatCategory
        flatCategory.category_group_name = category_group.name
        return flatCategory
      }))
    }, [])
    // console.log("ynab.api.getCategories, results: ", results);
    return results
  },
  getUnapprovedTransactions: async function (): Promise<TransactionDetail[]> {
    const args: ynabApiHelper.getTransactionsArgs = {
      budget_id: data.budget.id,
      type: 'unapproved'
    }
    // console.log('ynab.api.getUnapprovedTransactions, args: ', args)
    const results = await ynabApi.transactions.getTransactions(args.budget_id, args.since_date, args.type)
    // console.log('ynab.api.getUnapprovedTransactions, results: ', results)
    const unapprovedTransactions = results.data.transactions
    return unapprovedTransactions
  },
  getTransactionsSinceDate: async function (since_date: string | Date) {
    const args: ynabApiHelper.getTransactionsArgs = {
      budget_id: data.budget.id,
      since_date: since_date
    }
    // console.log('ynab.api.getTransactionsSinceDate, args: ', args)
    const results = (await ynabApi.transactions.getTransactions(args.budget_id, args.since_date, args.type)).data.transactions
    // console.log('ynab.api.getTransactionsSinceDate, results: ', results)
    return results
  },
  createTransaction: async function (payee_name: string, amount: number, date: string) {
    const args: ynabApiHelper.createTransactionArgs = {
      budget_id: data.budget.id,
      data: {
        transaction: {
          payee_name: payee_name.substring(0, 50),
          amount: amount,
          date: date,
          category_id: utility.fuzzySearch(data.categories, 'name', 'Uncategorized').id,
          account_id: utility.fuzzySearch(data.accounts, 'name', '7966').id
        }
      }
    }
    console.log('ynab.api.createTransaction, args: ', args)
    return await ynabApi.transactions.createTransaction(args.budget_id, args.data).catch(err => { console.log(err) })
  },
  setTransactionCategory: async function (transaction: TransactionDetail, category: FlatCategory) {
    const args: ynabApiHelper.updateTransactionArgs = {
      budget_id: data.budget.id,
      transaction_id: transaction.id,
      data: {
        transaction: {
          ...transaction,
          category_id: category.id
        }
      }
    }
    console.log('ynab.api.setTransactionCategory, args: ', args)
    return await ynabApi.transactions.updateTransaction(args.budget_id, args.transaction_id, args.data)
  },
  setTransactionMemo: async function (transaction: TransactionDetail, memo: string) {
    const args: ynabApiHelper.updateTransactionArgs = {
      budget_id: data.budget.id,
      transaction_id: transaction.id,
      data: {
        transaction: {
          ...transaction,
          memo: memo.substring(0, 200),
          flag_color: transaction.flag_color ?? TransactionDetail.FlagColorEnum.Blue
        }
      }
    }
    // if (!transaction.flag_color) {
    //   args.data.transaction.flag_color = TransactionDetail.FlagColorEnum.Blue
    // }
    console.log('ynab.api.setTransactionMemo, args: ', args)
    return await ynabApi.transactions.updateTransaction(args.budget_id, args.transaction_id, args.data)
  }
}

export const populateData = async function (): Promise<any> {
  console.log('ynab.populateData')
  const budgets = await api.getBudgets()
  if (budgets.length === 0) {
    throw ReferenceError('No budgets found.')
  }
  data.budget = budgets[0]
  data.accounts = await api.getAccounts()
  data.categories = await api.getCategories()
}
