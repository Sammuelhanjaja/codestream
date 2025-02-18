import { RequestType } from "vscode-languageserver-protocol";
import { AccessToken, AgentState } from "./agent.protocol";
import {
	CSConfirmRegistrationRequest,
	CSEligibleJoinCompany,
	CSGetInviteInfoRequest,
	CSGetInviteInfoResponse,
	CSLoginResponse,
	CSRegisterRequest,
	CSSetPasswordResponse,
	LoginResult,
} from "./api.protocol";
import { CSCompany } from "./api.protocol.models";

export function isLoginFailResponse(
	response: LoginSuccessResponse | LoginFailResponse
): response is LoginFailResponse {
	return (response as any).error !== undefined;
}

export interface LoginFailResponse {
	error: LoginResult;
	extra?: any;
}

export interface LoginSuccessResponse {
	loginResponse: CSLoginResponse;
	state: AgentState;
}

export type LoginResponse = LoginSuccessResponse | LoginFailResponse;

export interface PasswordLoginRequest {
	email: string;
	password: string;
	teamId?: string;
	team?: string;
}

export const PasswordLoginRequestType = new RequestType<
	PasswordLoginRequest,
	LoginResponse,
	void,
	void
>("codestream/login/password");

export interface TokenLoginRequest {
	token: AccessToken;
	teamId?: string;
	team?: string;
	codemarkId?: string;
	reviewId?: string;
	codeErrorId?: string;
	setEnvironment?: { environment: string; serverUrl: string };
}

export const TokenLoginRequestType = new RequestType<TokenLoginRequest, LoginResponse, void, void>(
	"codestream/login/token"
);

export interface OtcLoginRequest {
	code: string;
	teamId?: string;
	team?: string;
	errorGroupGuid?: string;
}

export const OtcLoginRequestType = new RequestType<OtcLoginRequest, LoginResponse, void, void>(
	"codestream/login/otc"
);

export interface GenerateLoginCodeRequest {
	email: string;
}

export interface GenerateLoginCodeResponse {
	status: LoginResult;
}

export const GenerateLoginCodeRequestType = new RequestType<
	GenerateLoginCodeRequest,
	GenerateLoginCodeResponse,
	void,
	void
>("codestream/login/generate-code");

export interface ConfirmLoginCodeRequest {
	email: string;
	code: string;
	teamId?: string;
	team?: string;
}

export const ConfirmLoginCodeRequestType = new RequestType<
	ConfirmLoginCodeRequest,
	LoginResponse,
	void,
	void
>("codestream/login/confirm");

export interface RegisterUserRequest extends CSRegisterRequest {
	checkForWebmail?: boolean;
}

export interface RegisterUserResponse {
	status: LoginResult;
	token?: string;
}

export const RegisterUserRequestType = new RequestType<
	RegisterUserRequest,
	RegisterUserResponse,
	void,
	void
>("codestream/registration");

export interface RegisterNrUserRequest {
	apiKey: string;
}

export interface RegisterNrUserResponse {
	token?: string;
	email?: string;
	status?: string;
	notInviteRelated?: boolean;
	teamId: string;
	eligibleJoinCompanies: CSEligibleJoinCompany[];
	isWebmail?: boolean;
	companies?: CSCompany[];
	accountIsConnected: boolean;
	info?: {
		message?: string;
		email?: string;
	};
}

export const RegisterNrUserRequestType = new RequestType<
	RegisterNrUserRequest,
	RegisterNrUserResponse,
	void,
	void
>("codestream/nr-registration");

export interface ConfirmRegistrationRequest extends CSConfirmRegistrationRequest {}

export interface ConfirmRegistrationResponse {
	user?: {
		id: string;
		eligibleJoinCompanies?: CSEligibleJoinCompany[];
	};
	status: LoginResult;
	token?: string;
	accountIsConnected?: boolean;
	isWebmail?: boolean;
	companies?: CSCompany[];
	setEnvironment?: {
		environment: string;
		serverUrl: string;
	};
}

export const ConfirmRegistrationRequestType = new RequestType<
	ConfirmRegistrationRequest,
	ConfirmRegistrationResponse,
	void,
	void
>("codestream/registration/confirm");

export interface GetInviteInfoRequest extends CSGetInviteInfoRequest {}

export interface GetInviteInfoResponse {
	status: LoginResult;
	info?: CSGetInviteInfoResponse;
}

export const GetInviteInfoRequestType = new RequestType<
	GetInviteInfoRequest,
	GetInviteInfoResponse,
	void,
	void
>("codestream/registration/invite-info");

export interface SendPasswordResetEmailRequest {
	email: string;
}

export const SendPasswordResetEmailRequestType = new RequestType<
	SendPasswordResetEmailRequest,
	void,
	void,
	void
>("codestream/sendPasswordResetEmail");

export interface SetPasswordRequest {
	password: string;
}

export const SetPasswordRequestType = new RequestType<
	SetPasswordRequest,
	CSSetPasswordResponse,
	void,
	void
>("codestream/setPassword");

interface GetAccessTokenRequest {}

interface GetAccessTokenResponse {
	accessToken: string;
}

export const GetAccessTokenRequestType = new RequestType<
	GetAccessTokenRequest,
	GetAccessTokenResponse,
	void,
	void
>("codestream/accessToken");
