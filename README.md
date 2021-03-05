# YNAB Assistant  <!-- omit in toc -->

An assistant for YNAB:
- Scrape Chase Bank real-time notification emails to create YNAB transactions in real-time.
- Scrape Amazon Order emails to add memos about what was purchased on unapproved YNAB transactions.
- Uses categorization rules to update categories for unapproved YNAB transactions.

<br/>

**Table of Contents**  <!-- omit in toc -->
- [Prerequisites](#prerequisites)
  - [Real-Time Transactions](#real-time-transactions)
  - [Amazon Order Details](#amazon-order-details)
  - [Auto-Categorization](#auto-categorization)
- [How It Works](#how-it-works)
- [File Guide](#file-guide)
- [Useful Knowledge](#useful-knowledge)
  - [Reading Emails with IMAP](#reading-emails-with-imap)
  - [Using Puppeteer to Scrape Websites](#using-puppeteer-to-scrape-websites)
- [License](#license)

<br/>

# Prerequisites

**You must use YNAB.**   
If you are not a YNAB user, this program is not going to do anything for you. You'll need to get an API Key from YNAB and plug it into the .env file. 

From there, things get a little murkier depending on which functionality you want to use and your bank / email provider.

## Real-Time Transactions

If you want to get real-time transaction infromation fed into YNAB, you'll want an account at Chase Bank and a Gmail account to use this out-of-the-box. 
- If you use a different email provider, you can likely use this with minimal modifications in code. 
- If you use a different bank, you might still be able to use this, but there are some things to consider. 

If you do use Chase Bank, then all you need to use this is to go into your account settings and turn on email notifications so that you get a notification for any transaction over $0.

If you bank elsewhere, then your bank neesd to offer a feature that sends transaction notification emails immediately when you make a transaction. If they can do this, then you can make that work with minimal modification to code to properly parse your bank's email messages.

## Amazon Order Details

Nothing special is needed for this other than a gmail account. Again, if you are using a different email provider you can likely still use this with minimal modification.

## Auto-Categorization

This part of the application can be used without any special requirements. 

<br/>

# How It Works

Connects to Gmail via IMAP and listens for emails. Refreshes basic data from YNAB every 15 minutes.
When a Chase Transaction email or Amazon Order email comes in, it adds them to a database to be processed, then kicks off the processor, which:
1. Scrapes transaction info from Chase Transaction Emails and adds transactions to YNAB where they don't already exist.
2. Scrapes order details from Amazon Order Emails and adds product desriptions to memo field in YNAB on unapproved transactions that match Amazon order details. 
3. Applies categorization-rules to unapproved YNAB transactions.

A note on usage of flag colors. If a transaction already has a flag color, it will not be modified. When the memo field is filled, the flag color is set to blue so you can tell that information has been entered in the memo without having to open the transaction in the app, but again this does not get set if the transaction already had a flag color.

<br/>

# File Guide

| File/Folder&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | Description |
|-------------|-------------|
| .vscode/                              | Contains workspace settings for VSCode. <br /> [User and Workspace Settings](https://code.visualstudio.com/docs/getstarted/settings)  |
| ├─ extensions.json                    | Specifies recommended VSCode extensions to use when working with this project. <br /> [Workspace recommended extensions](https://code.visualstudio.com/docs/editor/extension-gallery#_workspace-recommended-extensions) |
| └─ settings.json                      | Specifies VSCode workspace settings specific to this project. <br /> [Settings file locations](https://code.visualstudio.com/docs/getstarted/settings#_settings-file-locations) |
| data/                                 | Local "database" to store info scraped from emails so we never scrape the same data twice. |
| ├─ amazon-orders-data                 | nedb database for Amazon orders data obtained from scraping emails. |
| └─ chase-transactions-data            | nedb database for transactions data obtained from scraping emails. |
| dist/                                 | output from building typescript files as defined by tsconfig.json |
| node_modules/                         | *"npm install" will install the "dependencies" from package.json in this folder.* <br /> [npm-install](https://docs.npmjs.com/cli/install)  |
| src/                                  | |
| ├─ config/                            | |
| │  └─ env.ts                          | |
| ├─ data/                              | |
| │  ├─ models/                         | |
| │  │  ├─ amazon-order.ts              | |
| │  │  ├─ email.ts                     | |
| │  │  └─ transaction.ts               | |
| │  ├─ repositories/                   | |
| │  │  ├─ amazon-orders-repository.ts  | |
| │  │  └─ transactions-repository.ts   | |
| │  ├─ base-repository.ts              | |
| │  └─ database.ts                     | |
| ├─ integrations/                      | |
| │  ├─ email-listener.ts               | |
| │  └─ ynab.ts                         | |
| ├─ sandbox/                           | |
| │  ├─ compact.ts                      | |
| │  └─ unprocessed.ts                  | |
| ├─ tasks/                             | |
| │  ├─ auto-categorize-transactions.ts | |
| │  ├─ process-amazon-orders.ts        | |
| │  └─ process-chase-transactions.ts   | |
| ├─ tools/                             | |
| │  ├─ amazon-email-scraper.ts         | |
| │  ├─ amazon-order-details-scraper.ts | |
| │  └─ chase-email-scraper.ts          | |
| └─ app.ts                             | |
| .editorconfig                         | |
| .env                                  | |
| .env.example                          | |
| .eslintrc.js                          | |
| .gitignore                            | Specifies intentionally untracked files to ignore for version control. <br />[.gitignore](https://git-scm.com/docs/gitignore) |
| LICENSE                               | |
| package-lock.json                     | Ignored via .gitignore. It is automatically generated for any operations where npm modifies either the node_modules tree or package.json. <br /> *Documentation seems to indicate that it is supposed to be committed to source repositories.* <br />[npm-package-lock.json](https://docs.npmjs.com/configuring-npm/package-lock-json.html) |
| package.json                          | Provides information to npm to identify the project as well as handle the project's dependencies. <br /> [npm-package.json](https://docs.npmjs.com/configuring-npm/package-json.html) |
| README.md                             | This documentation serves as the starting point for anyone wishing to familiarize themselves with the project. It uses Markdown syntax for formatting. |
| rules.example.hjson                   | |
| rules.hjson                           | |
| tsconfig.json                         | TypeScript configuration file. |

<br/>

# Useful Knowledge

## Reading Emails with IMAP 

Decided to use IMAP to deal with reading gmail messages, since their API does not work with API keys, only OAuth.  

[IMAP Spec](https://tools.ietf.org/html/rfc3501)  

There are several libraries to use for IMAP in node.js:  
[imap-simple](https://github.com/chadxz/imap-simple)  
[node-imap](https://github.com/mscdex/node-imap)  
[imap-flow](https://github.com/andris9/imapflow)  

I went with the node-imap. I used imap-simple at first but it fell short by not allowing you to read the state of the connection to reconnect when needed.

## Using Puppeteer to Scrape Websites

This was pretty helpful, and it includes links that cover things like how to avoid getting shut down by Amazon:  
https://zenscrape.com/how-to-scrape-amazon-product-information-with-nodejs-and-puppeteer/

<br/>

# License

Copyright (c) 2020 Nathan Fast

This project is licensed under the MIT license. See the `LICENSE` file for more details.

<br/>

# TODO  <!-- omit in toc -->

This is by no means a comprehensive list, but these are some things I thought it would be worth mentioning here because they impact how useful this might be to others wishing to use this program (or contribute to it!).
- This documentation is currently lacking a bit. Specifically, it needs to cover:
  - More details on how to get set up.
  - How to use rules.hjson to configure auto-categorization rules.
- Easier configuration options so you can use different functionality without having to modify code to comment out certain routines. 
- Better error handling so that the program can continue to run when encountering recoverable errors.
- Improve some of the hard-coded strings or otherwise rigid logic that ties this to Chase Bank / Gmail. Some of these things could just be moved to the .env file. Others would need to be refactored to use regex first, and then the regex could be part of the .env file.
