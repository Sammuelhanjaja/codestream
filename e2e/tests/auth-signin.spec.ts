import { test } from "@playwright/test";
 import { SignInPage as SignInScreen } from "../screens/SignInScreen";
import { StartFlow } from "../screens/StartFlow";

test("can signIn", async ({ browser }) => {
  const cookies = [
    {
      name: "VstsSession",
      value:
        "VALUE",
      path: "/",
      domain: ".visualstudio.com",
      secure: true,
    },
    {
      name: "codespace.session_v2",
      value:
        "VALUE",
      path: "/",
      // TODO FIXME
      domain: "teamcodestream-python-clm-demo-url-for-codespace.github.dev",
      secure: true,
    },
    {
      name: "user_session",
      value: "VALUE",
      path: "/",
      domain: "github.com",
      secure: true,
    },
    {
      name: "_gh_sess",
      value:
        "VALUE",
      path: "/",
      domain: "github.com",
      secure: true,
    },
    {
      name: "__Host-user_session_same_site",
      value: "VALUE",
      path: "/",
      domain: "github.com",
      secure: true,
    },
  ];
 

  const startFlow = new StartFlow(browser);
  const codeStreamContext = await startFlow.start(
    // TODO FIXME
    "codespaces-url",
    {
      cookies: cookies,
      wait: 20000,
    }
  );

  const signInScreen = new SignInScreen(codeStreamContext);
  await signInScreen.signInClick();
  const sideBarScreen = await signInScreen.signInWith(
    "CODESTREAM-EMAIL",
    "CODESTREAM-PASSWORD"
  );

  await sideBarScreen.expectSidebar(); 
});
