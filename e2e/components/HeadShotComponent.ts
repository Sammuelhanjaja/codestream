import { Locator, Page } from "@playwright/test";
import { CodeStreamContext } from "../screens/CodeStreamContext";

export class HeadShotComponent {
  readonly page: Page;
  readonly parent: Locator;
  readonly headShotMenu: Locator;
  readonly accountItem: Locator;
  readonly signOutTarget: Locator;

  constructor(context: CodeStreamContext) {
    this.page = context.page;
    this.parent = context.parent;
    this.headShotMenu = this.parent.locator("#global-nav-more-label");
    this.accountItem = this.parent.locator("#li-item-account");
    this.signOutTarget = this.parent.locator(".label >> Text=Sign Out");
  }

  async signOut() {
    await this.toggleMenu();
    await this.accountItem.hover();
    await this.signOutTarget.click();
  }

  private async toggleMenu() {
    await this.headShotMenu.click();
  }
}
