'use strict';
import { version as vscodeVersion } from 'vscode';
import { extensionVersion } from '../extension';
import { Logger } from '../logger';
import {
    CreatePostRequest, CreatePostResponse,
    CreateRepoRequest, CreateRepoResponse,
    CreateStreamRequest, CreateStreamResponse,
    CSStream,
    FindRepoResponse,
    GetMarkerLocationsResponse, GetMarkerResponse, GetMarkersResponse,
    GetPostsResponse,
    GetRepoResponse, GetReposResponse,
    GetStreamResponse, GetStreamsResponse,
    GetTeamResponse, GetTeamsResponse,
    GetUserResponse, GetUsersResponse,
    LoginRequest, LoginResponse, StreamType
} from './types';
import fetch, { Headers, RequestInit, Response } from 'node-fetch';

export * from './types';

// const responseCache = new Map<string, Promise<any>>();

export class CodeStreamApi {

    constructor(public baseUrl: string) {
    }

    async login(email: string, password: string): Promise<LoginResponse> {
        const resp = await this.put<LoginRequest, LoginResponse>('/no-auth/login', {
            email: email,
            password: password
        });

        return resp;
    }

    createPost(token: string, request: CreatePostRequest): Promise<CreatePostResponse> {
        return this.post<CreatePostRequest, CreatePostResponse>(`/posts`, request, token);
    }

    createRepo(token: string, request: CreateRepoRequest): Promise<CreateRepoResponse> {
        return this.post<CreateRepoRequest, CreateRepoResponse>(`/repos`, request, token);
    }

    createStream(token: string, request: CreateStreamRequest): Promise<CreateStreamResponse> {
        return this.post<CreateStreamRequest, CreateStreamResponse>(`/streams`, request, token);
    }

    deleteStream(token: string, teamId: string, streamId: string) {
        return this.delete<any /*DeleteStreamResponse*/>(`/streams/${streamId}`, token);
    }

    findRepo(url: string, firstCommitHashes: string[]) {
        return this.get<FindRepoResponse>(`/no-auth/find-repo?url=${encodeURIComponent(url)}&knownCommitHashes=${firstCommitHashes.join(',')}&firstCommitHash=${firstCommitHashes[0]}`);
    }

    getMarker(token: string, teamId: string, markerId: string): Promise<GetMarkerResponse> {
        return this.get<GetMarkerResponse>(`/markers/${markerId}?teamId=${teamId}`, token);
    }

    getMarkerLocations(token: string, teamId: string, streamId: string, commitHash: string): Promise<GetMarkerLocationsResponse> {
        return this.get<GetMarkerLocationsResponse>(`/marker-locations?teamId=${teamId}&streamId=${streamId}&commitHash=${commitHash}`, token);
    }

    getMarkers(token: string, teamId: string, streamId: string): Promise<GetMarkersResponse> {
        return this.get<GetMarkersResponse>(`/markers?teamId=${teamId}&streamId=${streamId}`, token);
    }

    getPosts(token: string, teamId: string, streamId: string): Promise<GetPostsResponse> {
        return this.get<GetPostsResponse>(`/posts?teamId=${teamId}&streamId=${streamId}`, token);
    }

    getRepo(token: string, teamId: string, repoId: string): Promise<GetRepoResponse> {
        // TODO: Check cache
        return this.get<GetRepoResponse>(`/repos/${repoId}`, token);
    }

    getRepos(token: string, teamId: string): Promise<GetReposResponse> {
        return this.get<GetReposResponse>(`/repos?teamId=${teamId}`, token);
    }

    getStream<T extends CSStream>(token: string, teamId: string, streamId: string): Promise<GetStreamResponse<T>> {
        // TODO: Check cache
        return this.get<GetStreamResponse<T>>(`/streams/${streamId}`, token);
    }

    getStreams<T extends CSStream>(token: string, teamId: string, repoId?: string): Promise<GetStreamsResponse<T>> {
        return this.get<GetStreamsResponse<T>>(`/streams?teamId=${teamId}${repoId === undefined ? '' : `&repoId=${repoId}`}`, token);
    }

    getTeam(token: string, teamId: string): Promise<GetTeamResponse> {
        // TODO: Check cache
        return this.get<GetTeamResponse>(`/teams/${teamId}`, token);
    }

    getTeams(token: string, teamIds: string[]): Promise<GetTeamsResponse> {
        return this.get<GetTeamsResponse>(`/teams?ids=${teamIds.join(',')}`, token);
    }

    getUser(token: string, teamId: string, userId: string): Promise<GetUserResponse> {
        return this.get<GetUserResponse>(`/users/${userId}`, token);
    }

    getUsers(token: string, teamId: string): Promise<GetUsersResponse> {
        return this.get<GetUsersResponse>(`/users?teamId=${teamId}`, token);
    }

    private delete<R extends object>(url: string, token?: string): Promise<R> {
        let resp = undefined;
        if (resp === undefined) {
            resp = this.fetch<R>(url, { method: 'DELETE' }, token) as Promise<R>;
        }
        return resp;
    }

    private get<R extends object>(url: string, token?: string): Promise<R> {
        let resp = undefined; // responseCache.get(url) as Promise<R>;
        if (resp === undefined) {
            resp = this.fetch<R>(url, { method: 'GET' }, token) as Promise<R>;
            // responseCache.set(url, resp);
        }
        return resp;
    }

    private post<RQ extends object, R extends object>(url: string, body: RQ, token?: string): Promise<R> {
        return this.fetch<R>(url, {
            method: 'POST',
            body: JSON.stringify(body)
        }, token);
    }

    private put<RQ extends object, R extends object>(url: string, body: RQ, token?: string): Promise<R> {
        return this.fetch<R>(url, {
            method: 'PUT',
            body: JSON.stringify(body)
        }, token);
    }

    private async fetch<R extends object>(url: string, init?: RequestInit, token?: string): Promise<R> {
        if (init !== undefined || token !== undefined) {
            if (init === undefined) {
                init = {};
            }

            if (init.headers === undefined) {
                init.headers = new Headers();
            }

            if (init.headers instanceof Headers) {
                init.headers.append('Accept', 'application/json');
                init.headers.append('Content-Type', 'application/json');

                if (token !== undefined) {
                    init.headers.append('Authorization', `Bearer ${token}`);
                }

                init.headers.append('X-CS-Plugin-IDE', 'VS Code');
                init.headers.append('X-CS-Plugin-Version', extensionVersion);
                init.headers.append('X-CS-IDE-Version', vscodeVersion);
            }
        }

        Logger.log(`${(init && init.method) || 'GET'} ${url} ${CodeStreamApi.sanitize(init && init.body)}`);

        const resp = await fetch(`${this.baseUrl}${url}`, init);
        if (resp.status !== 200) throw await this.handleErrorResponse(resp);

        return CodeStreamApi.normalizeResponse(await resp.json<R>());
    }

    private async handleErrorResponse(response: Response): Promise<Error> {
        debugger;
        const data = await response.json();
        return new Error(`${response.status}: ${response.statusText}\n\n${JSON.stringify(data)}`);
    }

    static isStreamSubscriptionRequired(stream: CSStream): boolean {
        if (stream.type === StreamType.File) return false;
        if (stream.type === StreamType.Channel) {
            if (stream.memberIds === undefined) return false;
        }
        return true;
}

    static normalizeResponse<R extends object>(obj: { [key: string]: any }): R {
        for (const [key, value] of Object.entries(obj)) {
            if (key === '_id') {
                obj['id'] = value;
            }

            if (Array.isArray(value)) {
                obj[key] = value.map(v => this.normalizeResponse(v));
            }
            else if (typeof value === 'object') {
                obj[key] = this.normalizeResponse(value);
            }
        }

        return obj as R;
    }

    static sanitize(body: string | ArrayBuffer | ArrayBufferView | NodeJS.ReadableStream | undefined) {
        if (body === undefined || typeof body !== 'string') return '';

        return body.replace(/("password":)".*?"/gi, '$1"<hidden>"');
    }
}
