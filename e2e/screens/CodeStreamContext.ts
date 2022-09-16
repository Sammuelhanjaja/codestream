import { Locator, Page } from "@playwright/test";

export interface CodeStreamContext {
  /**
   * playwright calls these "pages" but with CodeStream they're more like screens
   *
   * @type {Page}
   * @memberof CodeStreamContext
   */
  page: Page;
  parent: Locator;
}
