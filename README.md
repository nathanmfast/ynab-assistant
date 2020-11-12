# YNAB Assistant  <!-- omit in toc -->

An assistant for YNAB:
- Scrape Chase Bank real-time notification emails to create YNAB transactions in real-time.
- Scrape Amazon Order emails to add memos about what was purchased on unapproved YNAB transactions.
- Uses categorization rules to update categories for unapproved YNAB transactions.

**Table of Contents**
- [How It Works](#how-it-works)
- [File Guide](#file-guide)
- [Useful Knowledge](#useful-knowledge)
  - [Reading Emails with IMAP](#reading-emails-with-imap)
  - [Using Puppeteer to Scrape Websites](#using-puppeteer-to-scrape-websites)
- [License](#license)

# How It Works

Connects to Gmail via IMAP and listens for emails. Refreshes basic data from YNAB every 15 minutes.
When a Chase Transaction email or Amazon Order email comes in, it adds them to a database to be processed, then kicks off the processor, which:
1. Scrapes transaction info from Chase Transaction Emails and adds transactions to YNAB where they don't already exist.
2. Scrapes order details from Amazon Order Emails and adds product desriptions to memo field in YNAB on unapproved transactions that match Amazon order details. 
3. Applies categorization-rules to unapproved YNAB transactions.

Flag color usage:  
- blue = we created the amazon transaction, but we don't have order details in the memo yet  
- yellow = we didn't create the transaction, but we added order details to the memo  
- green = we created the transaction, and if its an amazon transaction we added order details to the memo  

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

# License

Copyright (c) 2020 Nathan Fast

This project is licensed under the MIT license. See the `LICENSE` file for more details.