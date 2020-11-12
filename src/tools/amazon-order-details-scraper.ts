import * as puppeteer from 'puppeteer'
import { Browser, Page } from 'puppeteer'
import { AMAZON_USERNAME, AMAZON_PASSWORD } from '../config/env'

const settings = {
  username: AMAZON_USERNAME,
  password: AMAZON_PASSWORD
}

let isInitialized: boolean = false

let browser: Browser
let page: Page

const signIn = async function (): Promise<void> {
  browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1920,1080',
      '--user-agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3312.0 Safari/537.36"'
    ]
  })
  page = await browser.newPage()
  await page.goto('https://amazon.com/gp/css/order-details')
  await page.waitForSelector('#ap_email')
  await page.type('#ap_email', settings.username, { delay: 100 })
  await page.click('#continue')
  await page.waitForSelector('#ap_password')
  await page.type('#ap_password', settings.password, { delay: 100 })
  await page.click('#signInSubmit')
  await page.waitForNavigation()
}

const initialize = async function (): Promise<void> {
  if (!isInitialized) {
    await signIn()
    isInitialized = true
  }
}

export const getProductDetailsFromOrderUrl = async function (orderUrl: string): Promise<string[]> {
  try {
    await initialize()
    await page.goto(orderUrl)
    await page.waitForSelector('a.a-link-normal[href^="/gp/product/"]')
    return await page.evaluate(() => {
      // querySelectorAll returns NodeListof<Element> and Array.prototype.slice.call turns this into Element[]
      // innerText is not available for Element, but it is for HTMLElement, so the type guard (instanceof) in the filter makes sure its ok
      return Array.prototype.slice.call(document.body.querySelectorAll('a.a-link-normal[href^="/gp/product/"]'))
        .filter((link: Element) => { return (link instanceof HTMLElement) && !!link.innerText && link.innerText.length > 0 })
        .map((link: HTMLElement) => { return link.innerText })
    })
  } catch (err) {
    console.log('getProductDetailsFromOrderUrl, ERROR: ' + err)
  }
}

export const close = async function (): Promise<void> {
  if (browser) {
    await browser.close()
  }
}
