import { expect, Locator, Page } from "@playwright/test";
import { CodeStreamContext } from "./CodeStreamContext";
import { SidebarScreen } from "./SidebarScreen";

export class SignInPage {
  readonly context: CodeStreamContext;
  readonly page: Page;
  readonly parent: Locator;
  readonly signInTarget: Locator;
  readonly signInManually: Locator;
  readonly emailTextBox: Locator;
  readonly passwordTextBox: Locator;
  readonly signInWithPasswordTarget: Locator;

  constructor(context: CodeStreamContext) {
    this.context = context;
    this.page = context.page;
    this.parent = context.parent;

    this.signInTarget = context.parent.locator("text=Sign In");
    this.signInManually = context.parent.locator(
      "text=you can sign in manually."
    );
    this.emailTextBox = context.parent.locator("#login-input-email");
    this.passwordTextBox = context.parent.locator("#login-input-password");
    this.signInWithPasswordTarget = context.parent.locator(
      "text=Sign in with Password"
    );
  }

  async signInClick() {
    expect(this.signInTarget).not.toBeNull();
    await this.signInTarget.click();
    await this.page.waitForTimeout(2000);
  }

  async signInWith(
    userName: string,
    password?: string,
    options?: {
      by: "password" | "code";
    }
  ) {
    options = options || { by: "password" };

    // use 3 clicks to highlight everything
    await this.emailTextBox.click({ clickCount: 3 });
    await this.emailTextBox.type(userName);

    if (options?.by === "password") {
      if (!password) throw new Error("password required");

      await this.signInManually!.click();

      await this.passwordTextBox.click({ clickCount: 1 });
      await this.passwordTextBox.type(password);
    } else {
      throw new Error("not implemented");
    }
    await this.signInWithPasswordTarget.click();
    await this.page.waitForTimeout(8000);

    return new SidebarScreen(this.context);
  }
}
