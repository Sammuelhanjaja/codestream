"use strict";
import * as uuid from "uuid/v4";
import {
	ConfigurationChangeEvent,
	ConfigurationTarget,
	Disposable,
	Event,
	EventEmitter
} from "vscode";
import { AccessToken, AgentResult } from "../agent/agentConnection";
import { GlobalState, WorkspaceState } from "../common";
import { configuration } from "../configuration";
import { Container } from "../container";
import { Logger } from "../logger";
import { Functions, memoize, Strings } from "../system";
import { CSPost, CSRepository, CSStream, CSUser, LoginResult, PresenceStatus } from "./api";
import { Cache } from "./cache";
import { Marker } from "./models/markers";
import { Post } from "./models/posts";
import { Repository } from "./models/repositories";
import {
	ChannelStream,
	ChannelStreamCreationOptions,
	DirectStream,
	FileStream,
	Stream,
	StreamThread,
	StreamType
} from "./models/streams";
import { Team } from "./models/teams";
import { User } from "./models/users";
import { PresenceManager } from "./presence";
import { PresenceMiddleware } from "./presenceMiddleware";
import {
	MarkersMessageReceivedEvent,
	MessageReceivedEvent,
	MessageType,
	PostsMessageReceivedEvent,
	PubNubReceiver,
	RepositoriesMessageReceivedEvent,
	StreamsMessageReceivedEvent,
	TeamsMessageReceivedEvent,
	UsersMessageReceivedEvent
} from "./pubnub";
import { CodeStreamSessionApi } from "./sessionApi";
import { SessionState } from "./sessionState";

export {
	ChannelStream,
	ChannelStreamCreationOptions,
	DirectStream,
	FileStream,
	Marker,
	Post,
	PresenceStatus,
	Repository,
	Stream,
	StreamThread,
	StreamType,
	Team,
	User
};

export class CodeStreamSession implements Disposable {
	private _onDidChange = new EventEmitter<SessionChangedEvent>();
	get onDidChange(): Event<SessionChangedEvent> {
		return this._onDidChange.event;
	}

	private _onDidChangeStatus = new EventEmitter<SessionStatusChangedEvent>();
	get onDidChangeStatus(): Event<SessionStatusChangedEvent> {
		return this._onDidChangeStatus.event;
	}

	private _onDidReceivePosts = new EventEmitter<PostsReceivedEvent>();
	get onDidReceivePosts(): Event<PostsReceivedEvent> {
		return this._onDidReceivePosts.event;
	}

	private _disposable: Disposable | undefined;

	private _id: string | undefined;
	private _loginPromise: Promise<LoginResult> | undefined;
	private _presenceManager: PresenceManager | undefined;
	private _pubnub: PubNubReceiver | undefined;
	private _sessionApi: CodeStreamSessionApi | undefined;
	private _state: SessionState | undefined;
	private _signupToken: string | undefined;

	constructor(private _serverUrl: string) {}

	dispose() {
		this._disposable && this._disposable.dispose();
	}

	private async onConfigurationChanged(e: ConfigurationChangeEvent) {
		if (configuration.changed(e, configuration.name("serverUrl").value)) {
			this._serverUrl = Container.config.serverUrl;
			if (this._sessionApi !== undefined) {
				this._sessionApi.baseUrl = this._serverUrl;
			}

			if (this.signedIn) {
				this.logout();
			}
		}

		if (configuration.changed(e, configuration.name("email").value)) {
			if (this.signedIn) {
				this.logout();
			}
		}
	}

	private onMessageReceived(e: MessageReceivedEvent) {
		switch (e.type) {
			case MessageType.Posts: {
				this.firePostsReceived(new PostsReceivedEvent(this, e));
				this.incrementUnreads(e.posts);
				break;
			}
			case MessageType.Repositories:
				this.fireChanged(new RepositoriesAddedEvent(this, e));
				break;
			case MessageType.Streams:
				this.fireChanged(new StreamsAddedEvent(this, e));
				break;
			case MessageType.Users:
				this.fireChanged(new UsersChangedEvent(this, e));
				e.users.some(user => {
					if (user.id === this.userId) {
						this._state!.updateUser(user);
						this.calculateUnreads(user);
						return true;
					}
					return false;
				});
				break;
			case MessageType.Teams:
				this.fireChanged(new TeamsChangedEvent(this, e));
				break;
			case MessageType.Markers:
				this.fireChanged(new MarkersChangedEvent(this, e));
				break;
		}
	}

	private _changedDebounced: ((e: SessionChangedEvent) => void) | undefined;
	protected fireChanged(e: SessionChangedEvent) {
		if (this._changedDebounced === undefined) {
			this._changedDebounced = Functions.debounceMerge(
				(e: SessionChangedEvent) => this._onDidChange.fire(e),
				(combined: SessionChangedEvent[] | undefined, current: SessionChangedEvent) => {
					if (combined === undefined) return [current];

					const found = combined.find(_ => _.type === current.type);
					if (found === undefined) {
						combined.push(current);
					} else {
						(found as IMergeableEvent<SessionChangedEvent>).merge(current);
					}
					return combined;
				},
				250
			);
		}
		this._changedDebounced(e);
	}

	private _postsReceivedDebounced: ((e: PostsReceivedEvent) => void) | undefined;
	protected firePostsReceived(e: PostsReceivedEvent) {
		if (this._postsReceivedDebounced === undefined) {
			this._postsReceivedDebounced = Functions.debounceMerge(
				(e: PostsReceivedEvent) => this._onDidReceivePosts.fire(e),
				(combined: PostsReceivedEvent[] | undefined, current: PostsReceivedEvent) => {
					if (combined === undefined) return [current];

					combined[0].merge(current);
					return combined;
				},
				250,
				{ maxWait: 1000 }
			);
		}
		this._postsReceivedDebounced(e);
	}

	get id() {
		return this._id;
	}

	@signedIn
	get api(): CodeStreamSessionApi {
		return this._sessionApi!;
	}

	@signedIn
	get channels() {
		return this._state!.channels;
	}

	@signedIn
	get channelsAndDMs() {
		return this._state!.channelsAndDMs;
	}

	@signedIn
	get directMessages() {
		return this._state!.directMessages;
	}

	@signedIn
	get presence() {
		return this._presenceManager!;
	}

	@signedIn
	get repos() {
		return this._state!.repos;
	}

	get serverUrl() {
		return this._serverUrl;
	}

	get signedIn() {
		return this._status === SessionStatus.SignedIn;
	}

	private _status: SessionStatus = SessionStatus.SignedOut;
	get status() {
		return this._status;
	}

	@signedIn
	get team() {
		return this._state!.team;
	}

	@signedIn
	get teams() {
		return this._state!.teams;
	}

	@signedIn
	get user() {
		return this._state!.user;
	}

	get userId() {
		return this._state!.userId;
	}

	@signedIn
	get users() {
		return this._state!.users;
	}

	@signedIn
	get unreads() {
		return this._state!.unreads;
	}

	getSignupToken() {
		if (!this._signupToken) this._signupToken = uuid();

		return this._signupToken;
	}

	async login(email: string, password: string, teamId?: string): Promise<LoginResult>;
	async login(email: string, token: AccessToken, teamId?: string): Promise<LoginResult>;
	async login(
		email: string,
		passwordOrToken: string | AccessToken,
		teamId?: string
	): Promise<LoginResult> {
		const id = Strings.sha1(`${this.serverUrl}|${email}|${teamId}`);

		if (this._loginPromise === undefined) {
			this._loginPromise = this.loginCore(id, email, passwordOrToken, teamId);
		}

		const result = await this._loginPromise;
		if (result !== LoginResult.Success) {
			this._loginPromise = undefined;
		}
		return result;
	}

	async loginViaSignupToken(): Promise<LoginResult> {
		// TODO: reuse this._loginPromise
		if (this._signupToken === undefined) throw new Error("A signup token hasn't been generated");

		this._status = SessionStatus.SigningIn;
		const e: SessionStatusChangedEvent = { getStatus: () => this._status };
		this._onDidChangeStatus.fire(e);

		const result = await Container.agent.loginViaSignupToken(this._signupToken);

		if (result.error) {
			this._status = SessionStatus.SignedOut;
			e.reason = SessionStatusSignedOutReason.SignInFailure;
			this._onDidChangeStatus.fire(e);

			if (result.error !== LoginResult.NotOnTeam && result.error !== LoginResult.NotConfirmed) {
				this._signupToken = undefined;
			}

			return result.error;
		}

		await this.completeLogin(result, this._signupToken);
		return LoginResult.Success;
	}

	async logout(reset: boolean = true) {
		this._id = undefined;
		this._loginPromise = undefined;

		if (reset) {
			// Clear the access token
			await Container.context.globalState.update(GlobalState.AccessToken, undefined);
		}

		this._status = SessionStatus.SignedOut;

		if (Container.agent !== undefined) {
			void (await Container.agent.logout());
		}

		if (this._disposable !== undefined) {
			this._disposable.dispose();
			this._disposable = undefined;
		}

		// Clean up saved state
		this._presenceManager = undefined;
		this._pubnub = undefined;
		this._sessionApi = undefined;
		this._state = undefined;
		this._signupToken = undefined;

		setImmediate(() => this._onDidChangeStatus.fire({ getStatus: () => this._status }));
	}

	@signedIn
	leaveChannel(streamId: string, teamId: string) {
		this._pubnub!.ignoreStream(streamId);
		this._onDidChange.fire(new StreamsMembershipChangedEvent(streamId, teamId));
	}

	@signedIn
	addChannel(
		name: string,
		options: ChannelStreamCreationOptions = { membership: "auto", privacy: "public" }
	) {
		return this.channels.getOrCreateByName(name, options);
	}

	@signedIn
	getDefaultTeamChannel() {
		return this.channels.getOrCreateByName("general", { membership: "auto", privacy: "public" });
	}

	@signedIn
	async getStream(streamId: string): Promise<Stream | undefined> {
		const stream = await this.api.getStream(streamId);
		if (stream === undefined) return undefined;

		switch (stream.type) {
			case StreamType.Channel:
				return new ChannelStream(this, stream);
			case StreamType.Direct:
				return new DirectStream(this, stream);
			case StreamType.File:
				return new FileStream(this, stream);
			default:
				throw new Error("Invalid stream type");
		}
	}

	@signedIn
	hasSingleTeam(): Promise<boolean> {
		return this._state!.hasSingleTeam();
	}

	private async loginCore(
		id: string,
		email: string,
		passwordOrToken: string | AccessToken,
		teamId?: string
	): Promise<LoginResult> {
		Logger.log(`Signing ${email} into CodeStream (${this.serverUrl})`);

		try {
			this._id = id;

			this._status = SessionStatus.SigningIn;
			const e: SessionStatusChangedEvent = { getStatus: () => this._status };
			this._onDidChangeStatus.fire(e);

			if (!teamId) {
				// If there is a configuration settings for a team, use that above others
				teamId = Container.config.team
					? undefined
					: Container.context.workspaceState.get(WorkspaceState.TeamId);
			}

			const result = await Container.agent.login(
				email,
				passwordOrToken,
				teamId,
				Container.config.team
			);

			if (result.error) {
				// Clear the access token
				await Container.context.globalState.update(GlobalState.AccessToken, undefined);

				this._status = SessionStatus.SignedOut;
				e.reason = SessionStatusSignedOutReason.SignInFailure;
				this._onDidChangeStatus.fire(e);

				return result.error;
			}

			await this.completeLogin(result, id, teamId);

			return LoginResult.Success;
		} catch (ex) {
			ex.message = ex.message.replace("Request initialize failed with message: ", "CodeStream: ");

			Logger.error(ex);
			void (await this.logout(false));

			throw ex;
		}
	}

	private async completeLogin(result: AgentResult, id: string, teamId?: string) {
		const email = result.loginResponse.user.email;

		await Container.context.globalState.update(GlobalState.AccessToken, {
			value: result.loginResponse.accessToken
		} as AccessToken);

		// Update the saved e-mail on successful login
		if (email !== Container.config.email) {
			await configuration.update(
				configuration.name("email").value,
				email,
				ConfigurationTarget.Global
			);
		}

		if (!teamId || teamId !== result.state.teamId) {
			teamId = result.state.teamId;
			await Container.context.workspaceState.update(WorkspaceState.TeamId, teamId);
		}

		this._serverUrl = Container.config.serverUrl;
		this._pubnub = new PubNubReceiver(new Cache(this));
		this._state = new SessionState(this, teamId, result.loginResponse);
		this._sessionApi = new CodeStreamSessionApi(this._serverUrl, this._state.token, teamId);
		this._presenceManager = new PresenceManager(this._sessionApi, id);

		this.calculateUnreads(result.loginResponse.user);

		this._disposable = Disposable.from(
			this._pubnub.onDidReceiveMessage(this.onMessageReceived, this),
			this._pubnub,
			configuration.onDidChange(this.onConfigurationChanged, this),
			this._presenceManager,
			this._sessionApi.useMiddleware(new PresenceMiddleware(this._presenceManager))
		);

		this._presenceManager.online();

		Logger.log(
			`${email} signed into CodeStream (${this.serverUrl}); userId=${this.userId}, teamId=${teamId}`
		);

		this._status = SessionStatus.SignedIn;
		this._onDidChangeStatus.fire({ getStatus: () => this._status });
	}

	private async calculateUnreads(user: CSUser) {
		const lastReads = user.lastReads || {};
		const unreadCounter = this._state!.unreads;
		const entries = Object.entries(lastReads);
		const unreadStreams = await this._sessionApi!.getUnreadStreams();
		await Promise.all(
			entries.map(async ([streamId, lastReadSeqNum]) => {
				const stream = unreadStreams.find(stream => stream.id === streamId);
				if (stream) {
					const latestPost = await this._sessionApi!.getLatestPost(streamId);
					const unreadPosts = await this._sessionApi!.getPostsInRange(
						streamId,
						lastReadSeqNum + 1,
						latestPost.seqNum
					);

					let unreadCount = 0;
					let mentionCount = 0;
					unreadPosts.forEach(post => {
						if (!post.deactivated) {
							const mentionedUserIds = post.mentionedUserIds || [];
							if (mentionedUserIds.includes(user.id) || stream.type === StreamType.Direct) {
								mentionCount++;
								unreadCount++;
							} else {
								unreadCount++;
							}
						}
					});
					unreadCounter.mentions[streamId] = mentionCount;
					unreadCounter.unread[streamId] = unreadCount;
				}
			})
		);

		unreadCounter.getStreamIds().forEach(streamId => {
			if (lastReads[streamId] === undefined) {
				unreadCounter.clear(streamId);
			}
		});

		unreadCounter.lastReads = lastReads;
		this._onDidChange.fire(new UnreadsChangedEvent(unreadCounter.getValues()));
	}

	private async incrementUnreads(posts: CSPost[]) {
		const unreadCounter = this._state!.unreads;

		await Promise.all(
			posts.map(async post => {
				if (!post.deactivated && !post.hasBeenEdited && post.creatorId !== this.userId) {
					const stream = await this._sessionApi!.getStream(post.streamId);
					const mentionedUserIds = post.mentionedUserIds || [];
					if (mentionedUserIds.includes(this.user.id) || stream!.type === StreamType.Direct) {
						unreadCounter.incrementMention(post.streamId);
						unreadCounter.incrementUnread(post.streamId);
					} else {
						unreadCounter.incrementUnread(post.streamId);
					}
					if (unreadCounter.lastReads[post.streamId] === undefined) {
						unreadCounter.lastReads[post.streamId] = post.seqNum - 1;
					}
				}
			})
		);
		this._onDidChange.fire(new UnreadsChangedEvent(this._state!.unreads.getValues()));
	}
}

interface IMergeableEvent<T> {
	merge(e: T): void;
}

export class PostsReceivedEvent {
	constructor(
		private readonly session: CodeStreamSession,
		private readonly _event: PostsMessageReceivedEvent
	) {}

	get count() {
		return this._event.posts.length;
	}

	affects(id: string, type: "entity" | "stream" | "repo" | "team" = "stream") {
		return affects(this._event.posts, id, type);
	}

	entities() {
		return this._event.posts;
	}

	@memoize
	items() {
		return this._event.posts.map(p => new Post(this.session, p));
	}

	merge(e: PostsReceivedEvent) {
		this._event.posts.push(...e._event.posts);
	}
}

export enum SessionChangedType {
	Repositories = "repos",
	Streams = "streams",
	StreamsMembership = "streamsMembership",
	Teams = "teams",
	Markers = "markers",
	Users = "users",
	Unreads = "unreads"
}

export class RepositoriesAddedEvent implements IMergeableEvent<RepositoriesAddedEvent> {
	readonly type = SessionChangedType.Repositories;

	constructor(
		private readonly session: CodeStreamSession,
		private readonly _event: RepositoriesMessageReceivedEvent
	) {}

	get count() {
		return this._event.repos.length;
	}

	affects(id: string, type: "entity" | "team" = "team"): boolean {
		return affects(this._event.repos, id, type);
	}

	entities(): CSRepository[] {
		return this._event.repos;
	}

	@memoize
	items(): Repository[] {
		return this._event.repos.map(r => new Repository(this.session, r));
	}

	merge(e: RepositoriesAddedEvent) {
		this._event.repos.push(...e._event.repos);
	}
}

export class StreamsMembershipChangedEvent {
	readonly type = SessionChangedType.StreamsMembership;

	constructor(private readonly streamId: string, private readonly teamId: string) {}

	affects(id: string, type: "entity" | "team" = "entity"): boolean {
		if (type === "entity" && id === this.streamId) {
			return true;
		}
		if (type === "team" && id === this.teamId) {
			return true;
		}
		return false;
	}
}

export class StreamsAddedEvent implements IMergeableEvent<StreamsAddedEvent> {
	readonly type = SessionChangedType.Streams;

	constructor(
		private readonly session: CodeStreamSession,
		private readonly _event: StreamsMessageReceivedEvent
	) {}

	get count() {
		return this._event.streams.length;
	}

	affects(id: string, type: "entity" | "team" = "entity"): boolean {
		return affects(this._event.streams, id, type);
	}

	entities(): CSStream[] {
		return this._event.streams;
	}

	@memoize
	items(): Stream[] {
		return this._event.streams.map(s => {
			switch (s.type) {
				case StreamType.Channel:
					return new ChannelStream(this.session, s);
				case StreamType.Direct:
					return new DirectStream(this.session, s);
				case StreamType.File:
					return new FileStream(this.session, s);
			}
		});
	}

	merge(e: StreamsAddedEvent) {
		this._event.streams.push(...e._event.streams);
	}
}

class UsersChangedEvent {
	readonly type = SessionChangedType.Users;

	constructor(
		private readonly session: CodeStreamSession,
		private readonly _event: UsersMessageReceivedEvent
	) {}

	affects(id: string, type: "entity" | "team" = "entity") {
		return affects(this._event.users, id, type);
	}

	entities() {
		return this._event.users;
	}

	@memoize
	items(): User[] {
		return this._event.users.map(u => new User(this.session, u));
	}
}

class TeamsChangedEvent {
	readonly type = SessionChangedType.Teams;

	constructor(
		private readonly session: CodeStreamSession,
		private readonly _event: TeamsMessageReceivedEvent
	) {}

	affects(id: string, type: "entity" = "entity") {
		return affects(this._event.teams, id, type);
	}

	entities() {
		return this._event.teams;
	}

	@memoize
	items(): Team[] {
		return this._event.teams.map(t => new Team(this.session, t));
	}
}

class MarkersChangedEvent {
	readonly type = SessionChangedType.Markers;

	constructor(
		public readonly session: CodeStreamSession,
		private readonly _event: MarkersMessageReceivedEvent
	) {}

	affects(id: string, type: "entity" | "stream" | "team" = "stream") {
		return affects(this._event.markers, id, type);
	}

	entities() {
		return this._event.markers;
	}

	@memoize
	items(): Marker[] {
		throw new Error("Not implemented");
		// return this._event.markers.map(m => new Marker(this.session, m));
	}
}

export class UnreadsChangedEvent {
	readonly type = SessionChangedType.Unreads;

	constructor(
		public readonly unreads: {
			unread: { [key: string]: number };
			mentions: { [key: string]: number };
		}
	) {}

	affects(id: string, type: "entity") {
		return false;
	}

	entities() {
		return this.unreads;
	}

	@memoize
	items() {
		throw new Error("Not implemented");
	}

	getMentionCount() {
		return Object.values(this.unreads.mentions).reduce((total, count) => total + count, 0);
	}
}

export type SessionChangedEvent =
	| RepositoriesAddedEvent
	| StreamsAddedEvent
	| StreamsMembershipChangedEvent
	| UsersChangedEvent
	| TeamsChangedEvent
	| MarkersChangedEvent
	| UnreadsChangedEvent;

export enum SessionStatus {
	SignedOut = "signedOut",
	SigningIn = "signingIn",
	SignedIn = "signedIn"
}

export enum SessionStatusSignedOutReason {
	SignInFailure = "signInFailure"
}

export interface SessionStatusChangedEvent {
	getStatus(): SessionStatus;
	reason?: SessionStatusSignedOutReason;
}

function affects(
	data: { [key: string]: any }[],
	id: string,
	type: "entity" | "stream" | "repo" | "team"
) {
	let key: string;
	switch (type) {
		case "repo":
			key = "repoId";
			break;
		case "stream":
			key = "streamId";
			break;
		case "team":
			key = "teamId";
			break;
		default:
			key = "id";
	}
	return data.some(i => (i as { [key: string]: any })[key] === id);
}

function signedIn(
	target: CodeStreamSession,
	propertyName: string,
	descriptor: TypedPropertyDescriptor<any>
) {
	if (typeof descriptor.value === "function") {
		const method = descriptor.value;
		descriptor.value = function(this: CodeStreamSession, ...args: any[]) {
			if (!this.signedIn) throw new Error("Not Logged In");
			return method!.apply(this, args);
		};
	} else if (typeof descriptor.get === "function") {
		const get = descriptor.get;
		descriptor.get = function(this: CodeStreamSession, ...args: any[]) {
			if (!this.signedIn) throw new Error("Not Logged In");
			return get!.apply(this, args);
		};
	}
}
