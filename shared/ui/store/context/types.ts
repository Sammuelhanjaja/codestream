import {
	WebviewContext,
	WebviewPanels,
	WebviewModals,
	NewPullRequestBranch
} from "@codestream/protocols/webview";
import { AnyObject } from "@codestream/webview/utils";
import { CodemarkType } from "@codestream/protocols/api";

export enum ContextActionsType {
	SetProfileUser = "@context/SetProfileUser",
	SetCodemarkFileFilter = "@context/SetCodemarkFileFilter",
	SetCodemarkTypeFilter = "@context/SetCodemarkTypeFilter",
	SetCodemarkTagFilter = "@context/SetCodemarkTagFilter",
	SetCodemarkBranchFilter = "@context/SetCodemarkBranchFilter",
	SetCodemarkAuthorFilter = "@context/SetCodemarkAuthorFilter",
	SetChannelFilter = "@context/SetChannelFilter",
	SetContext = "@context/Set",
	OpenPanel = "@context/OpenPanel",
	ClosePanel = "@context/ClosePanel",
	OpenModal = "@context/OpenModal",
	CloseModal = "@context/CloseModal",
	SetFocusState = "@context/SetFocusState",
	SetCurrentStream = "@context/SetCurrentStream",
	SetIssueProvider = "@context/SetIssueProvider",
	SetCodemarksFileViewStyle = "@context/SetCodemarksFileViewStyle",
	SetCodemarksShowArchived = "@context/SetCodemarksShowArchived",
	SetCodemarksShowResolved = "@context/SetCodemarksShowResolved",
	SetCodemarksWrapComments = "@context/SetCodemarksWrapComments",
	SetChannelsMuteAll = "@context/SetChannelsMuteAll",
	SetShowFeedbackSmiley = "@context/SetShowFeedbackSmiley",
	SetNewPostEntryPoint = "@context/SetNewPostEntryPoint",
	SetRoute = "@context/SetRoute",
	SetChatProviderAccess = "@context/SetChatProviderAccess",
	SetCurrentCodemark = "@context/SetCurrentCodemark",
	SetComposeCodemarkActive = "@context/SetComposeCodemarkActive",
	RepositionCodemark = "@context/RepositionCodemark",
	SetCurrentReview = "@context/SetCurrentReview",
	SetCurrentReviewOptions = "@context/SetCurrentReviewOptions",
	SetCurrentCodeError = "@context/SetCurrentCodeError",
	SetCurrentRepo = "@context/SetCurrentRepo",
	SetCreatePullRequest = "@context/SetCreatePullRequest",
	SetCurrentPullRequest = "@context/SetCurrentPullRequest",
	SetCurrentErrorInboxOptions = "@context/SetCurrentErrorInboxOptions",
	SetCurrentInstrumentationOptions = "@context/SetCurrentInstrumentationOptions",
	SetCurrentPullRequestAndBranch = "@context/SetCurrentPullRequestAndBranch",
	SetNewPullRequestOptions = "@context/SetNewPullRequestOptions",
	SetStartWorkCard = "@context/SetStartWorkCard",
	SetOnboardStep = "@context/SetOnboardStep",
	SetIsFirstPageview = "@context/SetIsFirstPageview",
	SetNewRelicData = "@context/SetNewRelicData"
}

/**
 * This can also be any Titled Cased panel name
 */
export type PostEntryPoint =
	| "Stream"
	| "Global Nav"
	| "Spatial View"
	| "VSC SCM"
	| "Status"
	| string
	| undefined;

export interface ContextState extends WebviewContext {
	channelFilter: string;
	channelsMuteAll: boolean;

	codemarkFileFilter: string; // TODO: specify types
	codemarkTypeFilter: string;
	codemarkTagFilter: string;
	codemarkBranchFilter: string;
	codemarkAuthorFilter: string;

	codemarksFileViewStyle: "list" | "inline";
	codemarksShowArchived: boolean;
	codemarksShowResolved: boolean;
	codemarksWrapComments: boolean;

	spatialViewShowPRComments: boolean;

	issueProvider?: string;
	shareTargetTeamId?: string;
	panelStack: (WebviewPanels | string)[];
	activeModal?: WebviewModals;

	showFeedbackSmiley: boolean;

	newPostEntryPoint: PostEntryPoint;
	route: RouteState;

	chatProviderAccess: ChatProviderAccess;

	composeCodemarkActive: CodemarkType | undefined;

	pullRequestCheckoutBranch: boolean;
	newPullRequestOptions?: { branch: NewPullRequestBranch };
	currentInstrumentation?: any;
	errorInboxOptions?: { stack?: string; customAttributes?: string; url?: string };
}

export type ChatProviderAccess = "strict" | "permissive";

export enum Route {
	NewUser = "newUserEntry",
	Signup = "signup",
	Login = "login",
	ProviderAuth = "providerAuth",
	JoinTeam = "joinTeam",
	EmailConfirmation = "emailConfirmation",
	TeamCreation = "teamCreation",
	CompanyCreation = "companyCreation",
	ForgotPassword = "forgotPassword",
	MustSetPassword = "MustSetPassword",
	OktaConfig = "oktaConfig"
}

export interface RouteState {
	name: Route;
	params: AnyObject;
}
