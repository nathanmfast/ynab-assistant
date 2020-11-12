import { BaseRepository } from '../base-repository'
import { IAmazonOrder, AmazonOrder } from '../models/amazon-order'
import { IEmail } from '../models/email'

export class AmazonOrdersRepository extends BaseRepository<IAmazonOrder> {
  constructor () {
    super('amazon-orders')
  }

  AddAmazonOrder (email: IEmail): Promise<void> {
    return new Promise((resolve, reject) => {
      var doc = new AmazonOrder(email)
      this.collection.insert(doc, function (err) {
        if (err) {
          console.log('AmazonOrdersRepository.AddAmazonOrder, ERROR: ' + err)
          reject(err)
        }
        resolve()
      })
    })
  }

  HasAmazonOrder (emailUid: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.collection.findOne({ 'email.uid': emailUid }, function (err, doc) {
        if (err) {
          console.log('AmazonOrdersRepository.HasAmazonOrder, ERROR: ' + err)
          reject(err)
        }
        resolve(doc != null)
      })
    })
  }

  GetUnprocessedAmazonOrders (): Promise<IAmazonOrder[]> {
    return new Promise((resolve, reject) => {
      this.collection.find({ processed: false }, { }, function (err, docs) {
        if (err) {
          console.log('AmazonOrdersRepository.GetUnprocessedAmazonOrders, ERROR: ' + err)
          reject(err)
        }
        resolve(docs)
      })
    })
  }

  GetUnprocessedAmazonOrdersWithMissingDetails (): Promise<IAmazonOrder[]> {
    return new Promise((resolve, reject) => {
      this.collection.find({
        $and: [
          { processed: false },
          {
            $or: [
              { amount: { $exists: false } },
              { productDescriptions: { $exists: false } }
            ]
          }
        ]
      }, { }, function (err, docs) {
        if (err) {
          console.log('AmazonOrdersRepository.GetAmazonOrdersWithMissingDetails, ERROR: ' + err)
          reject(err)
        }
        resolve(docs)
      })
    })
  }

  AddAmazonOrderDetails (emailUid: number, amount: number, productDescriptions: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      this.collection.update(
        { 'email.uid': emailUid },
        {
          $set: {
            amount: amount,
            productDescriptions: productDescriptions
          }
        }, { }, function (err) {
          if (err) {
            console.log('AmazonOrdersRepository.AddAmazonOrderDetails, ERROR: ' + err)
            reject(err)
          }
          resolve()
        })
    })
  }

  GetAmazonOrdersToProcess (): Promise<IAmazonOrder[]> {
    return new Promise((resolve, reject) => {
      this.collection.find({
        $and: [
          { amount: { $exists: true } },
          { productDescriptions: { $exists: true } },
          {
            $or: [
              { processed: { $exists: false } },
              { processed: false }
            ]
          }
        ]
      }, { }, function (err, docs) {
        if (err) {
          console.log('AmazonOrdersRepository.GetAmazonOrdersToProcess, ERROR: ' + err)
          reject(err)
        }
        resolve(docs)
      })
    })
  }

  MarkAmazonOrderAsProcessed (emailUid: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.collection.update({ 'email.uid': emailUid }, { $set: { processed: true } }, { }, function (err) {
        if (err) {
          console.log('AmazonOrdersRepository.MarkAmazonOrderAsProcessed, ERROR: ' + err)
          reject(err)
        }
        resolve()
      })
    })
  }
}
