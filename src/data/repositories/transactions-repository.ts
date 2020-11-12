import { BaseRepository } from '../base-repository'
import { IEmail } from '../models/email'
import { ITransaction, Transaction } from '../models/transaction'

export class TransactionsRepository extends BaseRepository<ITransaction> {
  constructor () {
    super('chase-transactions')
  }

  AddTransaction (email: IEmail): Promise<void> {
    return new Promise((resolve, reject) => {
      var doc = new Transaction(email)
      this.collection.insert(doc, function (err) {
        if (err) {
          console.log('TransactionsRepository.AddTransaction, ERROR: ' + err)
          reject(err)
        }
        resolve()
      })
    })
  }

  HasTransaction (emailUid: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.collection.findOne({ 'email.uid': emailUid }, function (err, doc) {
        if (err) {
          console.log('TransactionsRepository.HasTransaction, ERROR: ' + err)
          reject(err)
        }
        resolve(doc != null)
      })
    })
  }

  GetUnprocessedTransactions (): Promise<Transaction[]> {
    return new Promise((resolve, reject) => {
      this.collection.find({ processed: false }, { }, function (err, docs) {
        if (err) {
          console.log('TransactionsRepository.GetUnprocessedTransactions, ERROR: ' + err)
          reject(err)
        }
        resolve(docs)
      })
    })
  }

  GetUnprocessedTransactionsWithMissingDetails (): Promise<Transaction[]> {
    return new Promise((resolve, reject) => {
      this.collection.find({
        $and: [
          { processed: false },
          {
            $or: [
              { amount: { $exists: false } },
              { payeeName: { $exists: false } },
              { date: { $exists: false } }
            ]
          }
        ]
      }, { }, function (err, docs) {
        if (err) {
          console.log('TransactionsRepository.GetTransactionsWithMissingDetails, ERROR: ' + err)
          reject(err)
        }
        resolve(docs)
      })
    })
  }

  AddTransactionDetails (emailUid: number, amount: number, payeeName: string, date: Date): Promise<void> {
    return new Promise((resolve, reject) => {
      this.collection.update(
        { 'email.uid': emailUid },
        {
          $set: {
            amount: amount,
            payeeName: payeeName,
            date: date
          }
        }, { }, function (err) {
          if (err) {
            console.log('TransactionsRepository.AddTransactionDetails, ERROR: ' + err)
            reject(err)
          }
          resolve()
        })
    })
  }

  GetTransactionsToProcess (): Promise<Transaction[]> {
    return new Promise((resolve, reject) => {
      this.collection.find({
        $and: [
          { amount: { $exists: true } },
          { payeeName: { $exists: true } },
          { date: { $exists: true } },
          {
            $or: [
              { processed: { $exists: false } },
              { processed: false }
            ]
          }
        ]
      }, { }, function (err, docs) {
        if (err) {
          console.log('TransactionsRepository.GetTransactionsToProcess, ERROR: ' + err)
          reject(err)
        }
        resolve(docs)
      })
    })
  }

  SetTransactionProcessed (emailUid: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.collection.update({ 'email.uid': emailUid }, { $set: { processed: true } }, { }, function (err) {
        if (err) {
          console.log('TransactionsRepository.setTransactionProcessed, ERROR: ' + err)
          reject(err)
        }
        resolve()
      })
    })
  }
}
