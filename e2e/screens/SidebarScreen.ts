import { expect, Locator, Page } from "@playwright/test";
import { CodeStreamContext } from "./CodeStreamContext";

export class SidebarScreen {
  readonly page: Page;
  readonly parent: Locator;
  readonly panes: Locator;

  constructor(context: CodeStreamContext) {
    this.page = context.page;
    this.parent = context.parent;
    this.panes = this.parent.locator(".pane-header");
  }

  async expectSidebar() {
    await expect((await this.panes.elementHandles()).length).toBeGreaterThan(0);
    return this.panes;
  }
}
