/*
    Database
    The sole purpose of this module is to provide dead-simple persistence of data that has been processed / needs to be processed.

    It should:
    - make interacting with the data as simple as possible

    It shouldn't:
    - leak abstractions or otherwise require consumers to work with the data store's syntax for querying / retrieving data
*/

import { AmazonOrdersRepository } from './repositories/amazon-orders-repository'
import { TransactionsRepository } from './repositories/transactions-repository'

class Context {
  _amazonOrdersRepository: AmazonOrdersRepository
  _transactionsRepository: TransactionsRepository

  constructor () {
    this._amazonOrdersRepository = new AmazonOrdersRepository()
    this._transactionsRepository = new TransactionsRepository()
  }

  get AmazonOrdersRepository (): AmazonOrdersRepository {
    return this._amazonOrdersRepository
  }

  get TransactionsRepository (): TransactionsRepository {
    return this._transactionsRepository
  }

  Compact (): void {
    this._amazonOrdersRepository.Compact()
    this._transactionsRepository.Compact()
  }
}

export const Database: Context = new Context()
