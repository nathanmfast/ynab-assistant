import { IEmail } from './email'

export interface ITransaction{
    email: IEmail,
    amount?: number,
    payeeName?: string,
    date?: Date
    processed: boolean
}

export class Transaction implements ITransaction {
    email: IEmail
    amount?: number
    payeeName?: string
    date?: Date
    processed: boolean

    constructor (email: IEmail) {
      this.email = email
      this.processed = false
    }
}
