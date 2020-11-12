import { IEmail } from './email'

export interface IAmazonOrder{
    email: IEmail
    amount?: number
    productDescriptions?: string[]
    processed: boolean
}

export class AmazonOrder implements IAmazonOrder {
    email: IEmail
    amount?: number
    productDescriptions?: string[]
    processed: boolean

    constructor (email: IEmail) {
      this.email = email
      this.processed = false
    }
}
