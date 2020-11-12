import * as Imap from 'imap'
import * as quotedPrintable from 'quoted-printable'
import { parseISO, format } from 'date-fns'
import { IEmail } from '../data/models/email'
import { Database } from '../data/database'
import * as events from 'events'
import { EMAIL_USERNAME, EMAIL_PASSWORD } from '../config/env'

// This is a hack to workaround this error:
// "Failed to connect to IMAP server: Error: self signed certificate"
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

// private

const config: Imap.Config = {
  user: EMAIL_USERNAME,
  password: EMAIL_PASSWORD,

  host: 'imap.gmail.com',
  port: 993,
  tls: true,
  authTimeout: 3000
}

const settings = {
  boxName: '[Gmail]/All Mail',

  // using parseISO so I can enter a date like a human and not deal with javascript nonsense (months start at 0, why god why)
  // format specified is as required for IMAP protocol
  startProcessingDate: format(parseISO('2020-10-16'), 'LLL dd, yyyy')
}

// internals

const getEmail = function (imapMessage: any): IEmail {
  var uid = imapMessage.attributes.uid
  var date = imapMessage.attributes.date
  var subject = imapMessage.parts.filter((part: any) => {
    return part.which === 'HEADER'
  })[0].body.subject[0]
  var text = imapMessage.parts.filter((part: any) => {
    return part.which === 'TEXT'
  })[0].body
  return {
    uid: uid,
    date: date,
    subject: subject,
    text: quotedPrintable.decode(text)
  }
}

const getMessage = function (message: Imap.ImapMessage): Promise<any> {
  return new Promise(function (resolve) {
    var attributes: any
    var messageParts: any = []
    var isHeader = /^HEADER/g
    function messageOnBody (stream: any, info: any) {
      var body = ''
      function streamOnData (chunk: any) {
        body += chunk.toString('utf8')
      }
      stream.on('data', streamOnData)
      stream.once('end', function streamOnEnd () {
        stream.removeListener('data', streamOnData)
        var part: any = {
          which: info.which,
          size: info.size,
          body: body
        }

        if (isHeader.test(part.which)) {
          part.body = Imap.parseHeader(part.body)
        }

        messageParts.push(part)
      })
    }
    function messageOnAttributes (attrs: any) {
      attributes = attrs
    }
    function messageOnEnd () {
      message.removeListener('body', messageOnBody)
      message.removeListener('attributes', messageOnAttributes)
      resolve({
        attributes: attributes,
        parts: messageParts
      })
    }
    message.on('body', messageOnBody)
    message.once('attributes', messageOnAttributes)
    message.once('end', messageOnEnd)
  })
}

const search = function (searchCriteria: any, fetchOptions: Imap.FetchOptions): Promise<IEmail[]> {
  return new Promise(function (resolve, reject) {
    imap.search(searchCriteria, function (err, uids) {
      if (err) {
        reject(err)
        return
      }
      if (!uids.length) {
        resolve([])
        return
      }
      var fetch = imap.fetch(uids, fetchOptions)
      var messagesRetrieved = 0
      var messages: any[] = []
      function fetchOnMessage (message: Imap.ImapMessage, seqNo: number) {
        getMessage(message).then(function (message) {
          messages[seqNo] = {
            ...message,
            seqNo: seqNo
          }
          messagesRetrieved++
          if (messagesRetrieved === uids.length) {
            fetchCompleted()
          }
        })
      }
      function fetchCompleted () {
        resolve(messages.filter(function (m) { return !!m }).map((imapMessage) => {
          return getEmail(imapMessage)
        }))
      }
      function fetchOnError (err: any) {
        fetch.removeListener('message', fetchOnMessage)
        fetch.removeListener('end', fetchOnEnd)
        reject(err)
      }
      function fetchOnEnd () {
        fetch.removeListener('message', fetchOnMessage)
        fetch.removeListener('error', fetchOnError)
      }
      fetch.on('message', fetchOnMessage)
      fetch.once('error', fetchOnError)
      fetch.once('end', fetchOnEnd)
    })
  })
}

// api

const getAmazonOrderEmails = async function (): Promise<IEmail[]> {
  var searchCriteria = [
    ['FROM', 'auto-confirm@amazon.com'],
    ['SINCE', settings.startProcessingDate],
    'UNANSWERED'
  ]
  var fetchOptions = {
    bodies: ['HEADER', 'TEXT'],
    markSeen: false
  }
  var results = await search(searchCriteria, fetchOptions)
  console.log('email.getAmazonOrderEmails: ', results)
  return results
}

const getChaseTransactionEmails = async function (): Promise<IEmail[]> {
  var searchCriteria = [
    ['SUBJECT', 'Your Single Transaction Alert from Chase'],
    ['SINCE', settings.startProcessingDate],
    'UNANSWERED'
  ]
  var fetchOptions = {
    bodies: ['HEADER', 'TEXT'],
    markSeen: false
  }
  var results = await search(searchCriteria, fetchOptions)
  console.log('email.getChaseTransactionEmails: ', results)
  return results
}

const processed = async function (uid: number): Promise<void> {
  console.log('email.processed:', uid)
  return await imap.addFlags(uid, '\\Answered', (error) => {
    if (error) {
      throw error
    }
  })
}

// flow

let isProcessingEmails: boolean = false
let processMoreEmails: boolean = false
let addedEmailsToDatabase: boolean = false
const eventEmitter: events.EventEmitter = new events.EventEmitter()

// processing

const addAmazonOrderEmailsToDatabase = async function (emails: IEmail[]): Promise<void> {
  for (var email of emails) {
    // add the amazonOrder to the database
    if (!await Database.AmazonOrdersRepository.HasAmazonOrder(email.uid)) {
      await Database.AmazonOrdersRepository.AddAmazonOrder(email)
      addedEmailsToDatabase = true
    }
    // we've got what we need in the database now, mark the email as answered
    await processed(email.uid)
  }
}

const processAmazonOrderEmails = async function () {
  await addAmazonOrderEmailsToDatabase(await getAmazonOrderEmails())
}

const addChaseTransactionEmailsToDatabase = async function (emails: IEmail[]): Promise<void> {
  for (var email of emails) {
    // add the transaction email to the database
    if (!await Database.TransactionsRepository.HasTransaction(email.uid)) {
      await Database.TransactionsRepository.AddTransaction(email)
      addedEmailsToDatabase = true
    }
    // we've got what we need in the database now, mark the email as answered
    await processed(email.uid)
  }
}

const processChaseTransactionEmails = async function () {
  await addChaseTransactionEmailsToDatabase(await getChaseTransactionEmails())
}

// imap

const imap: Imap = new Imap(config)

imap.once('ready', function () {
  imap.openBox(settings.boxName, false, function (err: Error, box: Imap.Box) {
    if (err) {
      throw err
    }
  })
})

imap.once('error', function (err: any) {
  console.log(err)
})

imap.once('end', function () {
  console.log('Connection ended')
})

imap.on('mail', async function (numNewMsgs: number) {
  console.log("You've got mail!")
  console.log('imap.state:', imap.state)

  isInitialized = true
  reconnectIfNecessary()

  if (isProcessingEmails) {
    processMoreEmails = true
  } else {
    processMoreEmails = false
    isProcessingEmails = true
    await processAmazonOrderEmails()
    await processChaseTransactionEmails()
    isProcessingEmails = false
    if (processMoreEmails) {
      processMoreEmails = false
      isProcessingEmails = true
      await processAmazonOrderEmails()
      await processChaseTransactionEmails()
      isProcessingEmails = false
    }
  }

  if (addedEmailsToDatabase) {
    eventEmitter.emit('new')
    addedEmailsToDatabase = false
  }
})

let isInitialized = false
export const listen = function (onNew: ()=>Promise<void>):void {
  if (!isInitialized) {
    imap.connect()
    eventEmitter.on('new', onNew)
  }
}

export const reconnectIfNecessary = function () {
  if (isInitialized && imap.state !== 'authenticated') {
    console.log('Reconnecting...')
    imap.connect()
    console.log('imap.state:', imap.state)
  }
}

export const state = function () {
  if (!isInitialized) {
    return 'not listening'
  }
  return imap.state
}
