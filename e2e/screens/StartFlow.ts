import { Browser, expect, Locator, Page } from "@playwright/test";
import { CodeStreamContext } from "./CodeStreamContext";

export class StartFlow {
  readonly browser: Browser;

  constructor(browser: Browser) {
    this.browser = browser;
  }

  async start(
    url: string,
    options?: {
      cookies?: {
        name: string;
        value: string;
        url?: string;
        domain?: string;
        path?: string;
        expires?: number;
        httpOnly?: boolean;
        secure?: boolean;
        sameSite?: "Strict" | "Lax" | "None";
      }[];
      /**
       * wait time after initial url load in ms
       *
       * @type {number}
       */
      wait?: number;
    }
  ): Promise<CodeStreamContext> {
    const browserContext = await this.browser.newContext();

    if (options?.cookies) {
      await browserContext.addCookies(options.cookies);
    }

    const page = await browserContext.newPage();
    await page.goto(url);

    if (options?.wait) {
      console.log(`waiting for ${options.wait}ms...`);
      await page.waitForTimeout(options.wait);
      console.log("waited");
    }

    await page.waitForSelector(".webview.ready");

    // possibly more than one frame, the CS panel is the "last" one
    // but this should probably be hardened since there are many iframes visible
    const outerFrame = (await page.frameLocator(".webview.ready")).last();
    // CS is inside another frame
    const innerFrame = await outerFrame
      .frameLocator("#active-frame")
      .locator("body");

    return { page, parent: innerFrame };
  }
}
