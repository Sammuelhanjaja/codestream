import {
	ChangeDataType,
	DidChangeDataNotificationType,
	GetReposScmRequestType,
	ReposScm,
	SwitchBranchRequestType,
} from "@codestream/protocols/agent";
import { CSMe } from "@codestream/protocols/api";
import { setProviderError } from "@codestream/webview/store/codeErrors/thunks";
import { bootstrapReviews } from "@codestream/webview/store/reviews/thunks";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import styled, { ThemeProvider } from "styled-components";
import { logError } from "../../../logger";
import { LoadingMessage } from "../../../src/components/LoadingMessage";
import { CodeStreamState } from "../../../store";
import { Button } from "../../../src/components/Button";
import { FloatingLoadingMessage } from "@codestream/webview/src/components/FloatingLoadingMessage";
import Icon from "../../Icon";
import { Link } from "../../Link";
import { Tab, Tabs } from "../../../src/components/Tabs";
import copy from "copy-to-clipboard";
import { GHOST } from "../../PullRequestTimelineItems";
import { InlineMenu } from "../../../src/components/controls/InlineMenu";
import {
	clearCurrentPullRequest,
	setCurrentPullRequest,
	setCurrentReview,
} from "../../../store/context/actions";
import {
	clearPullRequestCommits,
	getCurrentProviderPullRequest,
	getCurrentProviderPullRequestLastUpdated,
	updatePullRequestTitle,
} from "../../../store/providerPullRequests/slice";
import {
	api,
	clearPullRequestFiles,
	getPullRequestConversations,
	getPullRequestConversationsFromProvider,
} from "../../../store/providerPullRequests/thunks";
import * as reviewSelectors from "../../../store/reviews/reducer";
import { getPreferences } from "../../../store/users/reducer";
import { useAppDispatch, useAppSelector, useDidMount } from "../../../utilities/hooks";
import { HostApi } from "../../../webview-api";
import { confirmPopup } from "../../Confirm";
import { CreateCodemarkIcons } from "../../CreateCodemarkIcons";
import {
	PRAction,
	PRActionButtons,
	PRAuthor,
	PRBadge,
	PRBranch,
	PREditTitle,
	PRHeader,
	PRPlusMinus,
	PRStatus,
	PRStatusButton,
	PRStatusMessage,
	PRSubmitReviewButton,
	PRTitle,
} from "../../PullRequestComponents";
import Tooltip from "../../Tooltip";
import { PullRequestFileComments } from "../../PullRequestFileComments";
import Timestamp from "../../Timestamp";
import { setUserPreference } from "../../actions";
import { PullRequestFinishReview } from "../../PullRequestFinishReview";

const Root = styled.div`
	@media only screen and (max-width: ${props => props.theme.breakpoint}) {
		.wide-text {
			display: none;
		}
	}
	a {
		text-decoration: none;
		&:hover {
			color: var(--text-color-info);
		}
	}
	.mine {
		background: rgba(90, 127, 255, 0.08);
	}
	.codestream .stream & ul.contains-task-list {
		margin: 0 !important;
		padding: 0 !important;
		white-space: normal;
		li.task-list-item {
			margin: 0 !important;
			padding: 3px 0 3px 30px !important;
			list-style: none;
			input {
				margin-left: -30px;
			}
		}
	}
`;

interface ReposScmPlusName extends ReposScm {
	name: string;
}

const EMPTY_HASH = {};
const EMPTY_HASH2 = {};
const EMPTY_ARRAY = [];

export type autoCheckedMergeabilityStatus = "UNCHECKED" | "CHECKED" | "UNKNOWN";

export const PullRequest = () => {
	const dispatch = useAppDispatch();
	const derivedState = useAppSelector((state: CodeStreamState) => {
		const currentUser = state.users[state.session.userId!] as CSMe;
		const team = state.teams[state.context.currentTeamId];
		const currentPullRequest = getCurrentProviderPullRequest(state);
		const providerPullRequestLastUpdated = getCurrentProviderPullRequestLastUpdated(state);
		return {
			viewPreference: getPreferences(state).pullRequestView || "auto",
			reviewsStateBootstrapped: state.reviews.bootstrapped,
			reviewLinks: reviewSelectors.getAllReviewLinks(state),
			currentUser,
			currentPullRequestProviderId: state.context.currentPullRequest
				? state.context.currentPullRequest.providerId
				: undefined,
			currentPullRequestId: state.context.currentPullRequest
				? state.context.currentPullRequest.id
				: undefined,
			currentPullRequestCommentId: state.context.currentPullRequest
				? state.context.currentPullRequest.commentId
				: undefined,
			currentPullRequestSource: state.context.currentPullRequest
				? state.context.currentPullRequest.source
				: undefined,
			previousPullRequestView: state.context.currentPullRequest
				? state.context.currentPullRequest.previousView
				: undefined,
			currentPullRequest: currentPullRequest,
			currentPullRequestLastUpdated: providerPullRequestLastUpdated,
			composeCodemarkActive: state.context.composeCodemarkActive,
			team,
			textEditorUri: state.editorContext.textEditorUri,
			reposState: state.repos,
			checkoutBranch: state.context.pullRequestCheckoutBranch,
			prRepoId: currentPullRequest?.conversations?.repository?.prRepoId,
			labels: currentPullRequest?.conversations?.repository?.pullRequest?.labels,
		};
	});

	const pr = derivedState.currentPullRequest?.conversations?.repository?.pullRequest;
	useEffect(() => {
		if (!derivedState.currentPullRequestCommentId) return;

		const dataCommentId = document.querySelector(
			`[data-comment-id="${derivedState.currentPullRequestCommentId}"]`
		);
		if (dataCommentId) {
			dataCommentId.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
		}
	}, [derivedState.currentPullRequestCommentId]);

	const [activeTab, setActiveTab] = useState(1);
	const [scrollPosition, setScrollPosition] = useState(EMPTY_HASH2);
	const [ghRepo, setGhRepo] = useState<any>(EMPTY_HASH);
	const [isLoadingPR, setIsLoadingPR] = useState(false);
	const [isLoadingMessage, setIsLoadingMessage] = useState("");
	const [generalError, setGeneralError] = useState("");
	const [isLoadingBranch, setIsLoadingBranch] = useState(false);
	const [openRepos, setOpenRepos] = useState<ReposScmPlusName[]>(EMPTY_ARRAY);
	const [editingTitle, setEditingTitle] = useState(false);
	const [savingTitle, setSavingTitle] = useState(false);
	const [title, setTitle] = useState("");
	const [currentRepoChanged, setCurrentRepoChanged] = useState(false);
	const [finishReviewOpen, setFinishReviewOpen] = useState(false);
	const [oneLayerModal, setOneLayerModal] = useState(false);
	const [autoCheckedMergeability, setAutoCheckedMergeability] =
		useState<autoCheckedMergeabilityStatus>("UNCHECKED");
	const [prCommitsRange, setPrCommitsRange] = useState<string[]>([]);

	const switchActiveTab = tab => {
		// remember the scroll position of the tab we just left
		const container = document.getElementById("pr-scroll-container");
		if (container) setScrollPosition({ ...scrollPosition, [activeTab]: container.scrollTop });
		setActiveTab(tab);
	};

	const exit = async () => {
		await dispatch(clearCurrentPullRequest());
	};

	const PRError = styled.div`
		padding: 0px 15px 20px 15px;
		display: flex;
		align-items: center;
		> .icon {
			flex-grow: 0;
			flex-shrink: 0;
			display: inline-block;
			margin-right: 15px;
			transform: scale(1.5);
			color: #ff982d;
		}
		> div {
			color: #ff982d;
			flex-grow: 10;
			display: flex;
			align-items: center;
			button {
				margin-left: auto;
			}
		}
		strong {
			font-weight: normal;
			color: var(--text-color-highlight);
		}
		a {
			text-decoration: none;
			color: var(--text-color-highlight);
			&:hover {
				color: var(--text-color-info) !important;
			}
		}
	`;

	const _assignState = (pr, src?: string) => {
		if (!pr || !pr.repository) return;
		console.warn("_assignState src", src);
		setGhRepo(pr.repository);
		setTitle(pr.repository.pullRequest.title);
		setEditingTitle(false);
		setSavingTitle(false);
		setIsLoadingPR(false);
		setIsLoadingMessage("");
	};

	const initialFetch = async (message?: string) => {
		if (message) setIsLoadingMessage(message);
		setIsLoadingPR(true);

		const response = await dispatch(
			getPullRequestConversations({
				providerId: derivedState.currentPullRequestProviderId!,
				id: derivedState.currentPullRequestId!,
			})
		).unwrap();
		setGeneralError("");
		if (response?.error && response?.error.message) {
			setIsLoadingPR(false);
			setIsLoadingMessage("");
			setGeneralError(response.error.message);
			console.error(response.error.message);
			return undefined;
		} else {
			_assignState(response, "initialFetch");
			return response;
		}
	};

	/**
	 * This is called when a user clicks the "reload" button.
	 * with a "hard-reload" we need to refresh the conversation and file data
	 * @param message
	 */
	const reload = async (message?: string) => {
		console.log("PullRequest is reloading");
		if (message) setIsLoadingMessage(message);
		setIsLoadingPR(true);
		const response = await dispatch(
			getPullRequestConversationsFromProvider({
				providerId: derivedState.currentPullRequestProviderId!,
				id: derivedState.currentPullRequestId!,
			})
		).unwrap();
		_assignState(response, "reload");

		// just clear the files and commits data -- it will be fetched if necessary (since it has its own api call)
		dispatch(
			clearPullRequestFiles(
				derivedState.currentPullRequestProviderId!,
				derivedState.currentPullRequestId!
			)
		);
		dispatch(
			clearPullRequestCommits({
				providerId: derivedState.currentPullRequestProviderId!,
				id: derivedState.currentPullRequestId!,
			})
		);
	};

	const checkout = async () => {
		if (!pr) return;

		setIsLoadingBranch(true);

		const repoId = derivedState.prRepoId || "";
		const result = await HostApi.instance.send(SwitchBranchRequestType, {
			branch: pr!.headRefName,
			repoId: repoId,
		});
		if (result.error) {
			logError(result.error, {
				prRepoId: derivedState.prRepoId,
				branch: pr.headRefName,
				repoId: repoId,
				prRepository: pr!.repository,
			});

			confirmPopup({
				title: "Git Error",
				className: "wide",
				message: (
					<div className="monospace" style={{ fontSize: "11px" }}>
						{result.error}
					</div>
				),
				centered: false,
				buttons: [{ label: "OK", className: "control-button" }],
			});
			setIsLoadingBranch(false);
		} else {
			setIsLoadingBranch(false);
			getOpenRepos();
		}
	};

	useEffect(() => {
		if (pr && pr.headRefName && derivedState.checkoutBranch) {
			checkout();
			// clear the branch flag
			dispatch(setCurrentPullRequest(pr.providerId, pr.id));
		}
	}, [pr && pr.headRefName, derivedState.checkoutBranch]);

	useEffect(() => {
		if (!pr) return;

		const _didChangeDataNotification = HostApi.instance.on(
			DidChangeDataNotificationType,
			(e: any) => {
				if (e.type === ChangeDataType.Commits) {
					getOpenRepos().then(_ => {
						const currentOpenRepo = openRepos.find(
							_ =>
								_?.name.toLowerCase() === pr.repository?.name?.toLowerCase() ||
								_?.folder?.name?.toLowerCase() === pr.repository?.name?.toLowerCase()
						);
						setCurrentRepoChanged(
							!!(e.data.repo && currentOpenRepo && currentOpenRepo.currentBranch == pr.headRefName)
						);
					});
				}
			}
		);

		return () => {
			_didChangeDataNotification && _didChangeDataNotification.dispose();
		};
	}, [openRepos, pr]);

	const cantCheckoutReason = useMemo(() => {
		if (pr) {
			// Check for a name match in two places, covers edge case if repo was recently renamed
			const currentRepo = openRepos.find(
				_ =>
					_?.name.toLowerCase() === pr.repository?.name?.toLowerCase() ||
					_?.folder?.name?.toLowerCase() === pr.repository?.name?.toLowerCase()
			);
			if (!currentRepo) {
				return `You don't have the ${pr.repository?.name} repo open in your IDE`;
			}
			if (currentRepo.currentBranch == pr.headRefName) {
				return `You are on the ${pr.headRefName} branch`;
			}

			// branch is in a fork
			if (pr.headRepository?.isFork) {
				return `The source branch for this PR is located on the ${pr.headRepositoryOwner?.login}/${pr.headRepository?.name} fork`;
			}

			return "";
		} else {
			return "PR not loaded";
		}
	}, [pr, openRepos, currentRepoChanged]);

	const saveTitle = async () => {
		try {
			setIsLoadingMessage("Saving Title...");
			setSavingTitle(true);
			const response = await dispatch(
				api({ method: "updatePullRequestTitle", params: { title } })
			).unwrap();
			if (response !== undefined) {
				dispatch(
					updatePullRequestTitle({
						providerId: derivedState.currentPullRequestProviderId!,
						id: derivedState.currentPullRequestId!,
						pullRequestData: { title: title },
					})
				);
			}
		} catch (er) {
			dispatch(
				setProviderError(
					derivedState.currentPullRequestProviderId!,
					derivedState.currentPullRequestId!,
					{
						message: "Error saving title",
					}
				)
			);
		} finally {
			setSavingTitle(false);
			setEditingTitle(false);
			setIsLoadingMessage("");
		}
	};

	const getOpenRepos = async () => {
		const { reposState } = derivedState;
		const response = await HostApi.instance.send(GetReposScmRequestType, {
			inEditorOnly: true,
			includeCurrentBranches: true,
		});
		if (response && response.repositories) {
			const repos = response.repositories.map(repo => {
				const id = repo.id || "";
				return { ...repo, name: reposState[id] ? reposState[id].name : "" };
			});
			setOpenRepos(repos);
		}
	};

	const closeFileComments = () => {
		// note we're passing no value for the 3rd argument, which clears
		// the commentId
		if (oneLayerModal && pr) {
			dispatch(setCurrentPullRequest(pr.providerId, pr.id, "", "", "sidebar-diffs"));
		}

		if (!oneLayerModal && pr) {
			dispatch(setCurrentPullRequest(pr.providerId, pr.id, "", "", "details"));
		}
	};

	const linkHijacker = (e: any) => {
		if (e && e.target.tagName === "A" && e.target.text === "Changes reviewed on CodeStream") {
			const review = Object.values(derivedState.reviewLinks).find(
				_ => _.permalink === e.target.href.replace("?src=Bitbucket", "")
			);
			if (review) {
				e.preventDefault();
				e.stopPropagation();
				dispatch(clearCurrentPullRequest());
				dispatch(setCurrentReview(review.id));
			}
		}
	};

	useEffect(() => {
		document.addEventListener("click", linkHijacker);
		return () => {
			document.removeEventListener("click", linkHijacker);
		};
	}, [derivedState.reviewLinks]);

	// const numComments = useMemo(() => {
	// 	if (!pr || !pr.timelineItems || !pr.timelineItems.nodes) return 0;
	// 	const reducer = (accumulator, node) => {
	// 		let count = 0;
	// 		if (!node || !node.__typename) return accumulator;
	// 		const typename = node.__typename;
	// 		if (typename && typename.indexOf("Comment") > -1) count = 1;
	// 		if (typename === "PullRequestReview") {
	// 			// pullrequestreview can have a top-level comment,
	// 			// and multiple comment threads.
	// 			if (node.body) count++; // top-level comment (optional)
	// 			count += node.comments.nodes.length; // threads
	// 			node.comments.nodes.forEach(c => {
	// 				// each thread can have replies
	// 				if (c.replies) count += c.replies.length;
	// 			});
	// 		}
	// 		return count + accumulator;
	// 	};
	// 	return pr.timelineItems.nodes.reduce(reducer, 0);
	// }, [pr, pr?.updatedAt]);

	useDidMount(() => {
		if (!derivedState.reviewsStateBootstrapped) {
			dispatch(bootstrapReviews());
		}
		if (
			derivedState.currentPullRequestCommentId &&
			!derivedState.composeCodemarkActive &&
			derivedState.previousPullRequestView === "sidebar-diffs"
		) {
			setOneLayerModal(true);
		}

		getOpenRepos();
		initialFetch();
	});

	const _checkMergeabilityStatus = async () => {
		if (
			!derivedState.currentPullRequest ||
			!derivedState.currentPullRequest.conversations ||
			!derivedState.currentPullRequest.conversations.repository ||
			!derivedState.currentPullRequest.conversations.repository.pullRequest
		)
			return undefined;
		try {
			const response = await dispatch(
				api({
					method: "getPullRequestLastUpdated",
					params: {},
					options: { preventClearError: true },
				})
			).unwrap();
			if (
				derivedState.currentPullRequest &&
				response &&
				response.mergeable !==
					derivedState.currentPullRequest.conversations.repository.pullRequest.mergeable
			) {
				console.log(
					"getPullRequestLastUpdated is updating (mergeable)",
					derivedState.currentPullRequest.conversations.repository.pullRequest.mergeable,
					response.mergeable
				);
				reload();
				return response.mergeable !== "UNKNOWN";
			}
		} catch (ex) {
			console.error(ex);
		}
		return undefined;
	};

	const checkMergeabilityStatus = useCallback(() => {
		_checkMergeabilityStatus();
	}, [derivedState.currentPullRequest, derivedState.currentPullRequestId]);

	let interval;
	let intervalCounter = 0;
	// useEffect(() => {
	// 	interval && clearInterval(interval);
	// 	if (!derivedState.currentPullRequest) return;

	// 	if (
	// 		autoCheckedMergeability === "UNCHECKED" ||
	// 		(derivedState.currentPullRequest.conversations &&
	// 			derivedState.currentPullRequest.conversations.repository &&
	// 			derivedState.currentPullRequest.conversations.repository.pullRequest &&
	// 			derivedState.currentPullRequest.conversations.repository.pullRequest.mergeable ===
	// 				"UNKNOWN")
	// 	) {
	// 		console.log("PullRequest pr mergeable is UNKNOWN");
	// 		setTimeout(() => {
	// 			_checkMergeabilityStatus().then(_ => {
	// 				setAutoCheckedMergeability(_ ? "CHECKED" : "UNKNOWN");
	// 			});
	// 		}, 8000);
	// 	}
	// 	interval = setInterval(async () => {
	// 		// checks for 15 min
	// 		if (intervalCounter >= 3) {
	// 			interval && clearInterval(interval);
	// 			intervalCounter = 0;
	// 			console.warn(`stopped getPullRequestLastUpdated interval counter=${intervalCounter}`);
	// 			return;
	// 		}
	// 		try {
	// 			const response = await dispatch(
	// 				api({
	// 					method: "getPullRequestLastUpdated",
	// 					params: {},
	// 					options: { preventClearError: true, preventErrorReporting: true },
	// 				})
	// 			).unwrap();
	// 			if (
	// 				derivedState.currentPullRequest &&
	// 				response &&
	// 				response.updatedAt &&
	// 				derivedState.currentPullRequestLastUpdated &&
	// 				// if more than 5 seconds "off""
	// 				(Date.parse(response.updatedAt) -
	// 					Date.parse(derivedState.currentPullRequestLastUpdated)) /
	// 					1000 >
	// 					5
	// 			) {
	// 				console.warn(
	// 					"getPullRequestLastUpdated is updating",
	// 					response.updatedAt,
	// 					derivedState.currentPullRequestLastUpdated,
	// 					intervalCounter
	// 				);
	// 				intervalCounter = 0;
	// 				reload();
	// 				clearInterval(interval);
	// 			} else {
	// 				intervalCounter++;
	// 				console.log("incrementing counter", intervalCounter);
	// 			}
	// 		} catch (ex) {
	// 			console.error(ex);
	// 			interval && clearInterval(interval);
	// 		}
	// 	}, 300000); //300000 === 5 minute interval

	// 	return () => {
	// 		interval && clearInterval(interval);
	// 	};
	// }, [
	// 	derivedState.currentPullRequestLastUpdated,
	// 	derivedState.currentPullRequest,
	// 	autoCheckedMergeability,
	// ]);

	// const iAmRequested = useMemo(() => {
	// 	if (pr && pr.viewer) {
	// 		return pr.reviewRequests.nodes.find(
	// 			request => request.requestedReviewer && request.requestedReviewer.login === pr.viewer.login
	// 		);
	// 	}
	// 	return false;
	// }, [pr, pr?.updatedAt]);

	const breakpoints = {
		auto: "630px",
		"side-by-side": "10px",
		vertical: "100000px",
	};
	const addViewPreferencesToTheme = theme => ({
		...theme,
		breakpoint: breakpoints[derivedState.viewPreference],
	});

	if (!pr) {
		if (generalError) {
			return (
				<div style={{ display: "flex", height: "100vh", alignItems: "center" }}>
					<div style={{ textAlign: "left", width: "100%" }}>
						Error Loading Pull Request:
						<br />
						<div style={{ overflow: "auto", width: "100%", height: "7vh" }}>
							{generalError.replace(/\\t/g, "     ").replace(/\\n/g, "")}
						</div>
					</div>
				</div>
			);
		} else {
			return (
				<div style={{ display: "flex", height: "100vh", alignItems: "center" }}>
					<LoadingMessage>Loading Pull Request...</LoadingMessage>
				</div>
			);
		}
	} else {
		const statusIcon = pr.state === "OPEN" || pr.state === "CLOSED" ? "pull-request" : "git-merge";
		const action = pr.merged ? "merged " : "wants to merge ";

		if (oneLayerModal) {
			return (
				<ThemeProvider theme={addViewPreferencesToTheme}>
					<Root className="panel full-height">
						<CreateCodemarkIcons narrow onebutton />
						<PullRequestFileComments
							pr={pr}
							setIsLoadingMessage={setIsLoadingMessage}
							commentId={derivedState.currentPullRequestCommentId}
							quote={() => {}}
							onClose={closeFileComments}
							prCommitsRange={prCommitsRange}
						/>
					</Root>
				</ThemeProvider>
			);
		}

		return (
			<ThemeProvider theme={addViewPreferencesToTheme}>
				<Root className="bitbucket">
					<CreateCodemarkIcons narrow onebutton />
					{isLoadingMessage && <FloatingLoadingMessage>{isLoadingMessage}</FloatingLoadingMessage>}
					<PRHeader>
						{/* {iAmRequested && activeTab == 1 && (
							<PRIAmRequested>
								<div>
									<b>{(pr.author || GHOST).login}</b> requested your review
									<span className="wide-text"> on this pull request</span>.
								</div>
								<Button
									variant="success"
									size="compact"
									onClick={() => {
										switchActiveTab(4);
									}}
								>
									Add <span className="wide-text">your</span> review
								</Button>
							</PRIAmRequested>
						)} */}
						<PRTitle className={editingTitle ? "editing" : ""}>
							{editingTitle ? (
								<PREditTitle>
									<input
										id="title-input"
										name="title"
										value={title}
										className="input-text control"
										autoFocus
										type="text"
										onChange={e => setTitle(e.target.value)}
										placeholder=""
									/>
									<Button onClick={saveTitle} isLoading={savingTitle}>
										Save
									</Button>
									<Button
										variant="secondary"
										onClick={() => {
											setTitle("");
											setSavingTitle(false);
											setEditingTitle(false);
										}}
									>
										Cancel
									</Button>
								</PREditTitle>
							) : (
								<>
									{title || pr.title}{" "}
									<Tooltip title="Open on Bitbucket" placement="top" delay={1}>
										<span>
											<Link href={pr.url}>
												#{pr.number}
												<Icon name="link-external" className="open-external" />
											</Link>
										</span>
									</Tooltip>
								</>
							)}
						</PRTitle>
						<PRStatus>
							<PRStatusButton
								disabled
								fullOpacity
								variant={
									pr.isDraft
										? "neutral"
										: pr.state === "OPEN"
										? "success"
										: pr.state === "MERGED"
										? "merged"
										: pr.state === "CLOSED"
										? "destructive"
										: "primary"
								}
							>
								<Icon name={statusIcon} />
								{pr.isDraft ? "Draft" : pr.state ? pr.state.toLowerCase() : ""}
							</PRStatusButton>
							<PRStatusMessage>
								<PRAuthor>{(pr.author || GHOST).login}</PRAuthor>
								<PRAction>
									{/* {action} {pr.commits && pr.commits.totalCount} commits into{" "} */}
									<Link href={`${pr.repoUrl}/tree/${pr.baseRefName}`}>
										<PRBranch>
											{pr.repository && pr.repository.name}:{pr.baseRefName}
										</PRBranch>
									</Link>
									{" from "}
									<Link
										href={`${pr.headRepository?.url}/tree/${encodeURIComponent(pr.headRefName)}`}
									>
										<PRBranch>{pr.headRefName}</PRBranch>
									</Link>{" "}
									<Icon
										title="Copy"
										placement="bottom"
										name="copy"
										className="clickable"
										onClick={e => copy(pr.headRefName)}
									/>
								</PRAction>
								<Timestamp time={pr.createdAt} relative />
							</PRStatusMessage>
							<PRActionButtons>
								{pr.viewerCanUpdate && (
									<span>
										<Icon
											title="Edit Title"
											trigger={["hover"]}
											delay={1}
											onClick={() => {
												setTitle(pr.title);
												setEditingTitle(true);
											}}
											placement="bottom"
											name="pencil"
										/>
									</span>
								)}
								{isLoadingBranch ? (
									<Icon name="sync" className="spin" />
								) : (
									<span className={cantCheckoutReason ? "disabled" : ""}>
										<Icon
											title={
												<>
													Checkout Branch
													{cantCheckoutReason && (
														<div className="subtle smaller" style={{ maxWidth: "200px" }}>
															Disabled: {cantCheckoutReason}
														</div>
													)}
												</>
											}
											trigger={["hover"]}
											delay={1}
											onClick={checkout}
											placement="bottom"
											name="git-branch"
										/>
									</span>
								)}
								<InlineMenu
									title="View Settings"
									noChevronDown
									noFocusOnSelect
									items={[
										{ label: "-" },
										{
											key: "auto",
											label: "Auto",
											subtle: " (based on width)",
											checked: derivedState.viewPreference === "auto",
											action: () =>
												dispatch(
													setUserPreference({ prefPath: ["pullRequestView"], value: "auto" })
												),
										},
										{
											key: "vertical",
											label: "Vertical",
											subtle: " (best for narrow)",
											checked: derivedState.viewPreference === "vertical",
											action: () =>
												dispatch(
													setUserPreference({ prefPath: ["pullRequestView"], value: "vertical" })
												),
										},
										{
											key: "side-by-side",
											label: "Side-by-side",
											subtle: " (best for wide)",
											checked: derivedState.viewPreference === "side-by-side",
											action: () =>
												dispatch(
													setUserPreference({
														prefPath: ["pullRequestView"],
														value: "side-by-side",
													})
												),
										},
									]}
								>
									<span>
										<Icon
											title="View Settings"
											trigger={["hover"]}
											delay={1}
											placement="bottom"
											className={`${isLoadingPR ? "spin" : ""}`}
											name="gear"
										/>
									</span>
								</InlineMenu>
								<span>
									<Icon
										title="Reload"
										trigger={["hover"]}
										delay={1}
										onClick={() => {
											if (isLoadingPR) {
												console.warn("reloading pr, cancelling...");
												return;
											}
											reload("Reloading...");
										}}
										placement="bottom"
										className={`${isLoadingPR ? "spin" : ""}`}
										name="refresh"
									/>
								</span>
							</PRActionButtons>
						</PRStatus>
						{derivedState.currentPullRequest &&
							derivedState.currentPullRequest.error &&
							derivedState.currentPullRequest.error.message && (
								<PRError>
									<Icon name="alert" />
									<div>{derivedState.currentPullRequest.error.message}</div>
								</PRError>
							)}
						<Tabs style={{ marginTop: 0 }}>
							<Tab onClick={e => switchActiveTab(1)} active={activeTab == 1}>
								<Icon name="comment" />
								<span className="wide-text">Conversation</span>
								{/* <PRBadge>{numComments}</PRBadge> */}
							</Tab>
							<Tab onClick={e => switchActiveTab(2)} active={activeTab == 2}>
								<Icon name="git-commit" />
								<span className="wide-text">Commits</span>
								<PRBadge>{pr.commits}</PRBadge>
							</Tab>
							<Tab onClick={e => switchActiveTab(3)} active={activeTab == 3}>
								<Icon name="check" />
								<span className="wide-text">Checks</span>
								{/* <PRBadge>{pr.numChecks}</PRBadge> */}
							</Tab>
							{pr.pendingReview ? (
								<PRSubmitReviewButton>
									<Button variant="success" onClick={() => setFinishReviewOpen(!finishReviewOpen)}>
										Finish<span className="wide-text"> review</span>
										<PRBadge>
											{pr.pendingReview.comments ? pr.pendingReview.comments.totalCount : 0}
										</PRBadge>
										<Icon name="chevron-down" />
									</Button>
									{finishReviewOpen && (
										<PullRequestFinishReview
											pr={pr}
											mode="dropdown"
											setIsLoadingMessage={setIsLoadingMessage}
											setFinishReviewOpen={setFinishReviewOpen}
										/>
									)}
								</PRSubmitReviewButton>
							) : (
								<PRPlusMinus>
									<span className="added">
										+
										{!pr.files
											? 0
											: pr.files.nodes
													.map(_ => _.additions)
													.reduce((acc, val) => acc + val, 0)
													.toString()
													.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
									</span>{" "}
									<span className="deleted">
										-
										{!pr.files
											? 0
											: pr.files.nodes
													.map(_ => _.deletions)
													.reduce((acc, val) => acc + val, 0)
													.toString()
													.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
									</span>
								</PRPlusMinus>
							)}
						</Tabs>
					</PRHeader>
					{/*{!derivedState.composeCodemarkActive && (
						<ScrollBox>
							<div
								className="channel-list vscroll"
								id="pr-scroll-container"
								style={{ paddingTop: "10px" }}
							>
								{activeTab === 1 && (
									<PullRequestConversationTab
										ghRepo={ghRepo}
										autoCheckedMergeability={autoCheckedMergeability}
										checkMergeabilityStatus={checkMergeabilityStatus}
										setIsLoadingMessage={setIsLoadingMessage}
										initialScrollPosition={scrollPosition[1]}
									/>
								)}
								{activeTab === 2 && (
									<PullRequestCommitsTab
										pr={pr}
										ghRepo={ghRepo}
										initialScrollPosition={scrollPosition[2]}
									/>
								)}
								{activeTab === 4 && (
									<PullRequestFilesChangedTab
										key="files-changed"
										pr={pr}
										initialScrollPosition={scrollPosition[4]}
										setIsLoadingMessage={setIsLoadingMessage}
										prCommitsRange={prCommitsRange}
										setPrCommitsRange={setPrCommitsRange}
									/>
								)}
							</div>
						</ScrollBox>
					)} */}

					{/* {!derivedState.composeCodemarkActive && derivedState.currentPullRequestCommentId && (
						<PullRequestFileComments
							pr={pr}
							setIsLoadingMessage={setIsLoadingMessage}
							commentId={derivedState.currentPullRequestCommentId}
							quote={() => {}}
							onClose={closeFileComments}
							prCommitsRange={prCommitsRange}
						/>
					)} */}
				</Root>
			</ThemeProvider>
		);
	}
};

// import {
// 	ChangeDataType,
// 	DidChangeDataNotificationType,
// 	FetchThirdPartyPullRequestPullRequest,
// 	GetReposScmRequestType,
// 	GetReposScmResponse,
// } from "@codestream/protocols/agent";
// import { CSMe } from "@codestream/protocols/api";
// import React, { useState } from "react";
// import styled, { ThemeProvider } from "styled-components";

// import { FloatingLoadingMessage } from "@codestream/webview/src/components/FloatingLoadingMessage";
// import { PRHeadshot } from "@codestream/webview/src/components/Headshot";
// import { PRHeadshotName } from "@codestream/webview/src/components/HeadshotName";
// import { Tab, Tabs } from "@codestream/webview/src/components/Tabs";
// import { CodeStreamState } from "@codestream/webview/store";
// import { bootstrapReviews } from "@codestream/webview/store/reviews/thunks";
// import { useAppDispatch, useAppSelector, useDidMount } from "@codestream/webview/utilities/hooks";
// import { ErrorMessage } from "../../../src/components/ErrorMessage";
// import { LoadingMessage } from "../../../src/components/LoadingMessage";
// import { clearCurrentPullRequest, setCurrentPullRequest } from "../../../store/context/actions";
// import {
// 	clearPullRequestCommits,
// 	clearPullRequestFiles,
// 	getCurrentProviderPullRequest,
// 	getCurrentProviderPullRequestLastUpdated,
// 	getPullRequestExactId,
// 	getPullRequestId,
// } from "../../../store/providerPullRequests/slice";
// import {
// 	getPullRequestConversations,
// 	getPullRequestConversationsFromProvider,
// } from "../../../store/providerPullRequests/thunks";
// import { getPreferences } from "../../../store/users/reducer";
// import { HostApi } from "../../../webview-api";
// import CancelButton from "../../CancelButton";
// import { CreateCodemarkIcons } from "../../CreateCodemarkIcons";
// import Icon from "../../Icon";
// import { Link } from "../../Link";
// import { MarkdownText } from "../../MarkdownText";
// import { PullRequestBottomComment } from "../../PullRequestBottomComment";
// import { PullRequestCommitsTab } from "../../PullRequestCommitsTab";
// import {
// 	PRActionIcons,
// 	PRBadge,
// 	PRBranch,
// 	PRBranchTruncated,
// 	PRError,
// 	PRHeader,
// 	PRStatusButton,
// 	PRTitle,
// } from "../../PullRequestComponents";
// import { PullRequestFileComments } from "../../PullRequestFileComments";
// import { PullRequestFilesChangedTab } from "../../PullRequestFilesChangedTab";
// import Timestamp from "../../Timestamp";
// import Tooltip from "../../Tooltip";
// //import { Timeline } from "./Timeline";
// import { PRAuthorBadges } from "../../PullRequestConversationTab";
// //import { PipelineBox } from "./PipelineBox";
// import { OpenUrlRequestType } from "@codestream/protocols/webview";
// import { Timeline } from "./Timeline";

// export const PullRequestRoot = styled.div`
// 	position: absolute;
// 	width: 100%;
// 	background: var(-app-background-color) !important;
// 	span.narrow-text {
// 		display: none !important;
// 	}
// 	@media only screen and (max-width: ${props => props.theme.breakpoint}) {
// 		.wide-text {
// 			display: none;
// 		}
// 		span.narrow-text {
// 			display: inline-block !important;
// 		}
// 	}
// 	a {
// 		text-decoration: none;
// 		&:hover {
// 			color: var(--text-color-info);
// 		}
// 	}
// 	.mine {
// 		background: rgba(90, 127, 255, 0.08);
// 	}
// 	.codestream .stream & ul.contains-task-list {
// 		margin: 0 !important;
// 		padding: 0 !important;
// 		white-space: normal;
// 		li.task-list-item {
// 			margin: 0 !important;
// 			padding: 3px 0 3px 30px !important;
// 			list-style: none;
// 			input {
// 				margin-left: -30px;
// 			}
// 		}
// 	}
// 	b {
// 		color: var(--text-color-highlight);
// 	}
// 	${PRHeadshotName} {
// 		img {
// 			border-radius: 50%;
// 		}
// 	}
// 	${PRHeadshot} {
// 		img {
// 			border-radius: 50%;
// 		}
// 	}
// 	${PRHeader} {
// 		margin-top: 20px;
// 		margin-bottom: 0px;
// 	}
// 	${PRTitle} {
// 		margin-top: 10px;
// 		margin-bottom: 5px;
// 		color: var(--text-color-highlight);
// 	}
// 	${PRStatusButton} {
// 		border-radius: 4px;
// 	}
// 	${PRBranch} {
// 		color: var(--text-color-info);
// 	}
// 	${PRBranchTruncated} {
// 		color: var(--text-color-info);
// 	}
// 	button {
// 		border-radius: 4px;
// 	}
// 	button.narrow {
// 		padding: 1px 3px !important;
// 	}
// 	.icon.circled {
// 		display: inline-flex;
// 		height: 30px;
// 		width: 30px;
// 		border-radius: 15px;
// 		place-items: center;
// 		justify-content: center;
// 		color: var(--text-color-subtle);
// 		border: 1px solid var(--base-border-color);
// 		margin: 0 10px 0 15px;
// 		vertical-align: -3px;
// 		svg {
// 			opacity: 0.7;
// 		}
// 	}
// `;

// const Left = styled.div`
// 	pre.stringify {
// 		font-size: 10px;
// 		background: var(--app-background-color);
// 		padding: 10px;
// 		overflow: auto;
// 	}
// 	width: 100%;
// 	padding-right: 48px;
// 	min-height: 100%;
// `;

// const Header = styled.div`
// 	display: flex;
// 	${PRActionIcons} {
// 		display: inline-flex;
// 	}
// 	${PRStatusButton} {
// 		margin-bottom: 5px;
// 	}
// `;

// export const OutlineBox = styled.div`
// 	border-radius: 5px;
// 	border: 1px solid var(--base-border-color);
// 	margin: 0 20px 15px 20px;
// 	position: relative;
// 	:after {
// 		content: "";
// 		display: block;
// 		position: absolute;
// 		height: 15px;
// 		width: 1px;
// 		left: 30px;
// 		top: 100%;
// 		background: var(--base-border-color);
// 	}
// `;

// export const FlexRow = styled.div`
// 	align-items: center;
// 	padding: 10px;
// 	display: flex;
// 	flex-wrap: wrap;
// 	.right {
// 		margin-left: auto;
// 		white-space: nowrap;
// 	}
// 	.row-icon {
// 		flex-grow: 0;
// 		flex-basis: min-content;
// 	}
// 	.bigger {
// 		display: inline-block;
// 		transform: scale(1.5);
// 		margin: 0 15px 0 12px;
// 		opacity: 0.7;
// 	}
// 	.overlap {
// 		position: absolute !important;
// 		top: -5px;
// 		right: 5px;
// 		display: inline-block;
// 		transform: scale(0.75);
// 	}
// 	.pad-left {
// 		padding-left: 10px;
// 	}
// 	.pl5 {
// 		padding-left: 5px;
// 	}
// 	.action-button {
// 		width: 75px;
// 	}
// 	.disabled {
// 		cursor: not-allowed;
// 	}
// 	textarea {
// 		margin: 5px 0 5px 0;
// 		width: 100% !important;
// 		height: 75px;
// 	}
// 	.action-button-wrapper {
// 		align-items: center;
// 		display: flex;
// 		flex-wrap: no-wrap;
// 		@media only screen and (max-width: 350px) {
// 			flex-wrap: wrap;
// 			justify-content: center;
// 			.action-button {
// 				margin-top: 10px;
// 			}
// 		}
// 	}
// `;

// const Description = styled.div`
// 	margin: 20px;
// `;

// const TabActions = styled.div`
// 	margin-top: -5px;
// 	margin-left: auto;
// `;

// const InlineIcon = styled.div`
// 	display: inline-block;
// 	white-space: nowrap;
// `;

// const stateMap = {
// 	OPEN: "open",
// 	CLOSED: "closed",
// 	MERGED: "merged",
// 	DECLINED: "declined",
// 	SUPERSEDED: "superseded",
// };

// const EMPTY_HASH = {};
// const EMPTY_ARRAY = [];
// let insertText;
// let insertNewline;
// let focusOnMessageInput;

// const GL_404_HELP = "https://docs.newrelic.com/docs/codestream/troubleshooting/reverse-proxy";

// export const PullRequest = () => {
// 	const dispatch = useAppDispatch();
// 	const derivedState = useAppSelector((state: CodeStreamState) => {
// 		const { preferences } = state;
// 		const currentUser = state.users[state.session.userId!] as CSMe;
// 		const team = state.teams[state.context.currentTeamId];
// 		const currentPullRequest = getCurrentProviderPullRequest(state);
// 		const currentPullRequestIdExact = getPullRequestExactId(state);
// 		const providerPullRequestLastUpdated = getCurrentProviderPullRequestLastUpdated(state);
// 		const order: "oldest" | "newest" = preferences.pullRequestTimelineOrder || "oldest";
// 		const filter: "comments" | "history" | "all" = preferences.pullRequestTimelineFilter || "all";
// 		return {
// 			order,
// 			filter,
// 			viewPreference: (getPreferences(state) || {}).pullRequestView || "auto",
// 			reviewsStateBootstrapped: state.reviews.bootstrapped,
// 			currentUser,
// 			currentPullRequestProviderId: state.context.currentPullRequest
// 				? state.context.currentPullRequest.providerId
// 				: undefined,
// 			currentPullRequestId: getPullRequestId(state),
// 			currentPullRequestIdExact: currentPullRequestIdExact,
// 			currentPullRequestCommentId: state.context.currentPullRequest
// 				? state.context.currentPullRequest.commentId
// 				: undefined,
// 			currentPullRequest: currentPullRequest,
// 			currentPullRequestLastUpdated: providerPullRequestLastUpdated,
// 			previousPullRequestView: state.context.currentPullRequest
// 				? state.context.currentPullRequest.previousView
// 				: undefined,
// 			isVsIde: state.ide.name === "VS",
// 			composeCodemarkActive: state.context.composeCodemarkActive,
// 			team,
// 			textEditorUri: state.editorContext.textEditorUri,
// 			reposState: state.repos,
// 			checkoutBranch: state.context.pullRequestCheckoutBranch,
// 		};
// 	});

// 	const [didMount, setDidMount] = useState(false);
// 	const [activeTab, setActiveTab] = useState(1);
// 	const [isEditing, setIsEditing] = useState(false);
// 	const [isLoadingPR, setIsLoadingPR] = useState(false);
// 	const [isLoadingMessage, setIsLoadingMessage] = useState("");
// 	const [generalError, setGeneralError] = useState("");
// 	const [collapseAll, setCollapseAll] = useState(false);
// 	const [oneLayerModal, setOneLayerModal] = useState(false);

// 	const [rightOpen, setRightOpen] = useState(false);
// 	const [openRepos, setOpenRepos] = useState<any[]>(EMPTY_ARRAY);
// 	const [editingTitle, setEditingTitle] = useState(false);
// 	const [savingTitle, setSavingTitle] = useState(false);
// 	const [title, setTitle] = useState("");
// 	const [finishReviewOpen, setFinishReviewOpen] = useState(false);
// 	const [dynamicKey, setDynamicKey] = useState("");
// 	const [prCommitsRange, setPrCommitsRange] = useState<string[]>([]);
// 	const [isMerging, setIsMerging] = useState(false);
// 	const [isDeclining, setIsDeclining] = useState(false);
// 	const [isMergingStrategy, setIsMergingStrategy] = useState("");

// 	const breakpoints = {
// 		auto: "630px",
// 		"side-by-side": "10px",
// 		vertical: "100000px",
// 	};
// 	const addViewPreferencesToTheme = theme => ({
// 		...theme,
// 		breakpoint: breakpoints[derivedState.viewPreference],
// 	});

// 	const closeFileComments = () => {
// 		// note we're passing no value for the 3rd argument, which clears
// 		// the commentId
// 		// if (pr) dispatch(setCurrentPullRequest(pr.providerId, pr.idComputed));
// 		if (oneLayerModal && pr) {
// 			dispatch(setCurrentPullRequest(pr.providerId, pr.idComputed, "", "", "sidebar-diffs"));
// 		}

// 		if (!oneLayerModal && pr) {
// 			dispatch(setCurrentPullRequest(pr.providerId, pr.idComputed, "", "", "details"));
// 		}
// 	};

// 	const _assignState = _pr => {
// 		if (!_pr) return;
// 		// if (!_pr.project) {
// 		// 	console.warn("possible bad request");
// 		// }

// 		//	if (_pr && _pr.project) setTitle(_pr.project.mergeRequest.title);
// 		setEditingTitle(false);
// 		setSavingTitle(false);
// 		setIsLoadingPR(false);
// 		setIsLoadingMessage("");
// 	};

// 	const getOpenRepos = async () => {
// 		const { reposState } = derivedState;
// 		const response: GetReposScmResponse = await HostApi.instance.send(GetReposScmRequestType, {
// 			inEditorOnly: true,
// 			includeCurrentBranches: true,
// 		});
// 		if (response && response.repositories) {
// 			const repos = response.repositories.map(repo => {
// 				const id = repo.id || "";
// 				return { ...repo, name: reposState[id] ? reposState[id].name : "" };
// 			});
// 			setOpenRepos(repos);
// 		}
// 	};

// 	let interval;
// 	let intervalCounter = 0;
// 	useDidMount(() => {
// 		interval && clearInterval(interval);
// 		if (!derivedState.reviewsStateBootstrapped) {
// 			dispatch(bootstrapReviews());
// 		}
// 		if (
// 			derivedState.currentPullRequestCommentId &&
// 			!derivedState.composeCodemarkActive &&
// 			derivedState.previousPullRequestView === "sidebar-diffs"
// 		) {
// 			setOneLayerModal(true);
// 		}

// 		let _didChangeDataNotification;
// 		getOpenRepos();
// 		initialFetch().then((_: any | undefined) => {
// 			_didChangeDataNotification = HostApi.instance.on(DidChangeDataNotificationType, (e: any) => {
// 				if (e.type === ChangeDataType.Commits) {
// 					reload("Updating...");
// 				}
// 			});
// 			setDidMount(true);
// 		});

// 		return () => {
// 			_didChangeDataNotification && _didChangeDataNotification.dispose();
// 		};
// 	});

// 	// useEffect(() => {
// 	// 	// don't run this until we have mounted
// 	// 	if (!didMount) return;

// 	// 	interval && clearInterval(interval);
// 	// 	interval = setInterval(async () => {
// 	// 		try {
// 	// 			if (intervalCounter >= 60) {
// 	// 				// two hours
// 	// 				interval && clearInterval(interval);
// 	// 				intervalCounter = 0;
// 	// 				console.warn(`stopped getPullRequestLastUpdated interval counter=${intervalCounter}`);
// 	// 				return;
// 	// 			}

// 	// 			const response = (await dispatch(
// 	// 				api(
// 	// 					"getPullRequestLastUpdated",
// 	// 					{},
// 	// 					{ preventClearError: true, preventErrorReporting: true }
// 	// 				)
// 	// 			)) as any;
// 	// 			if (
// 	// 				derivedState.currentPullRequest &&
// 	// 				derivedState.currentPullRequestLastUpdated &&
// 	// 				response &&
// 	// 				response.updatedAt &&
// 	// 				derivedState.currentPullRequestLastUpdated &&
// 	// 				// if more than 5 seconds "off""
// 	// 				(Date.parse(response.updatedAt) -
// 	// 					Date.parse(derivedState.currentPullRequestLastUpdated)) /
// 	// 					1000 >
// 	// 					5
// 	// 			) {
// 	// 				console.warn(
// 	// 					"getPullRequestLastUpdated is updating",
// 	// 					response.updatedAt,
// 	// 					derivedState.currentPullRequestLastUpdated,
// 	// 					intervalCounter
// 	// 				);
// 	// 				intervalCounter = 0;
// 	// 				fetch();
// 	// 				clearInterval(interval);
// 	// 			} else {
// 	// 				intervalCounter++;
// 	// 				console.log("incrementing counter", intervalCounter);
// 	// 			}
// 	// 		} catch (ex) {
// 	// 			console.error(ex);
// 	// 			interval && clearInterval(interval);
// 	// 		}
// 	// 	}, 120000); //120000 === 2 minute interval

// 	// 	return () => {
// 	// 		interval && clearInterval(interval);
// 	// 	};
// 	// }, [didMount, derivedState.currentPullRequestLastUpdated, derivedState.currentPullRequest]);

// 	// TODO fix this thing (need the PR typing here)
// 	const pr: any = derivedState.currentPullRequest?.conversations?.repository?.pullRequest;

// 	const initialFetch = async (message?: string) => {
// 		if (message) setIsLoadingMessage(message);
// 		setIsLoadingPR(true);

// 		const response = await dispatch(
// 			getPullRequestConversations({
// 				providerId: derivedState.currentPullRequestProviderId!,
// 				id: derivedState.currentPullRequestId!,
// 			})
// 		).unwrap();
// 		setGeneralError("");
// 		if (response && response.error && response.error.message) {
// 			setIsLoadingPR(false);
// 			setIsLoadingMessage("");
// 			setGeneralError(response.error.message);
// 			console.error(response.error.message);
// 			return undefined;
// 		} else {
// 			console.warn(response);
// 			_assignState(response);
// 			return response;
// 		}
// 	};

// 	/**
// 	 * Called after an action that requires us to re-fetch from the provider
// 	 * @param message
// 	 */
// 	const fetch = async (message?: string) => {
// 		if (message) setIsLoadingMessage(message);
// 		setIsLoadingPR(true);

// 		const response = await dispatch(
// 			getPullRequestConversationsFromProvider({
// 				providerId: derivedState.currentPullRequestProviderId!,
// 				id: derivedState.currentPullRequestId!,
// 			})
// 		).unwrap();
// 		_assignState(response);
// 	};

// 	const reload = async (message?: string) => {
// 		console.log("MergeRequest is reloading");
// 		fetch(message);

// 		// just clear the files and commits data -- it will be fetched if necessary (since it has its own api call)
// 		dispatch(
// 			clearPullRequestFiles({
// 				providerId: derivedState.currentPullRequestProviderId!,
// 				id: derivedState.currentPullRequestId!,
// 			})
// 		);
// 		dispatch(
// 			clearPullRequestCommits({
// 				providerId: derivedState.currentPullRequestProviderId!,
// 				id: derivedState.currentPullRequestId!,
// 			})
// 		);
// 		// we can force the child components to update
// 		// by changing part of its key attribute
// 		setDynamicKey(new Date().getTime().toString());
// 	};

// 	const __onDidRender = functions => {
// 		insertText = functions.insertTextAtCursor;
// 		insertNewline = functions.insertNewlineAtCursor;
// 		focusOnMessageInput = functions.focus;
// 	};

// 	// const numComments = useMemo(() => {
// 	// 	if (
// 	// 		!derivedState.currentPullRequest ||
// 	// 		!derivedState.currentPullRequest.conversations ||
// 	// 		!derivedState.currentPullRequest.conversations.project
// 	// 	)
// 	// 		return 0;
// 	// 	const _pr = derivedState.currentPullRequest.conversations.project.mergeRequest;
// 	// 	if (!_pr || !_pr.discussions || !_pr.discussions.nodes) return 0;
// 	// 	const reducer = (accumulator, node) => {
// 	// 		if (node && node.notes && node.notes.nodes && node.notes.nodes.length) {
// 	// 			return node.notes.nodes.length + accumulator;
// 	// 		}
// 	// 		return accumulator;
// 	// 	};
// 	// 	return _pr.discussions.nodes.reduce(reducer, 0);
// 	// }, [pr, pr?.updatedAt]);

// 	const scrollToDiv = div => {
// 		if (!div) return;
// 		const modalRoot = document.getElementById("modal-root");
// 		if (modalRoot) {
// 			// the 60 is because of the height of the sticky header; we want to give the
// 			// div a little space at the top
// 			const y = div.getBoundingClientRect().top + modalRoot.children[0].scrollTop - 60;
// 			modalRoot.children[0].scrollTo({ top: y, behavior: "smooth" });
// 		}

// 		// start the outline 500ms later, to give it time to scroll into view
// 		setTimeout(() => div.classList.add("highlight-outline"), 500);
// 		// remove the class once animation stops in case we need to add it back again later
// 		setTimeout(() => div.classList.remove("highlight-outline"), 2000);
// 	};

// 	const [threadIndex, setThreadIndex] = useState(0);
// 	const jumpToNextThread = () => {
// 		const threads = document.getElementsByClassName("unresolved-thread-start");
// 		const div = threads[threadIndex] || threads[0]; // if we're off the edge go back to beginning
// 		scrollToDiv(div);
// 		setThreadIndex(threadIndex >= threads.length - 1 ? 0 : threadIndex + 1);
// 	};

// 	const [unresolvedThreads, resolvedThreads] = (() => {
// 		// TODO FIX THIS or remove?? (does bitbucket have notion of resolving comments / discussions??)
// 		if (!pr || !pr.discussions || !pr.discussions.nodes) return [0, 0];
// 		return [
// 			pr.discussions.nodes.filter(_ => _.resolvable && !_.resolved).length,
// 			pr.discussions.nodes.filter(_ => _.resolvable && _.resolved).length,
// 		];
// 	})();

// 	// const edit = () => setIsEditing(true);

// 	// const declinePullRequest = async () => {
// 	// 	setIsLoadingMessage("Closing...");
// 	// 	await dispatch(api("closePullRequest", { text: "" }));
// 	// 	setIsLoadingMessage("");
// 	// 	setIsDeclining(true);
// 	// };

// 	// const mergePullRequest = async () => {
// 	// 	setIsLoadingMessage("Merging...");
// 	// 	await dispatch(api("mergePullRequest", { text: "" }));
// 	// 	setIsLoadingMessage("");
// 	// 	setIsMerging(true);
// 	// 	let reason = "";
// 	// 	switch (isMergingStrategy) {
// 	// 		case "Merge commit":
// 	// 			reason = "MERGE_COMMIT";
// 	// 			break;
// 	// 		case "Squash":
// 	// 			reason = "SQUASH";
// 	// 			break;
// 	// 		case "Fast forward":
// 	// 			reason = "FASTFORWARD";
// 	// 			break;
// 	// 	}
// 	// };

// 	const { order } = derivedState;

// 	if (!pr) {
// 		return (
// 			<div
// 				style={{
// 					display: "flex",
// 					height: "100vh",
// 					alignItems: "center",
// 					background: "var(--sidebar-background)",
// 				}}
// 			>
// 				<div style={{ position: "absolute", top: "20px", right: "20px" }}>
// 					<CancelButton onClick={() => dispatch(clearCurrentPullRequest())} />
// 				</div>
// 				{generalError && (
// 					<ErrorMessage>
// 						Error Loading Pull Request:
// 						<br />
// 						<div style={{ overflow: "auto", width: "100%", height: "7vh" }}>
// 							{generalError.replace(/\\t/g, "     ").replace(/\\n/g, "")}
// 						</div>
// 					</ErrorMessage>
// 				)}
// 				{!generalError && <LoadingMessage>Loading Pull Request...</LoadingMessage>}
// 			</div>
// 		);
// 	}

// 	const bottomComment = (
// 		<div style={{ margin: "0 20px" }}>
// 			<PullRequestBottomComment
// 				pr={pr}
// 				setIsLoadingMessage={setIsLoadingMessage}
// 				__onDidRender={__onDidRender}
// 			/>
// 		</div>
// 	);

// 	const closeRight = () => setRightOpen(false);

// 	// hijacks links to user profiles which have HREFs like "/ppezaris"
// 	const hijackUserLinks = event => {
// 		const href: string = event?.target?.getAttribute("HREF");
// 		const dataset = event?.target?.dataset;
// 		if (href && dataset?.referenceType === "user" && dataset?.user) {
// 			event.preventDefault();
// 			const url = href.toLowerCase().startsWith("http") ? href : `${pr.baseWebUrl}/${href}`;
// 			HostApi.instance.send(OpenUrlRequestType, { url });
// 		}
// 	};

// 	if (oneLayerModal) {
// 		return (
// 			<ThemeProvider theme={addViewPreferencesToTheme}>
// 				<PullRequestRoot className="panel full-height">
// 					<CreateCodemarkIcons narrow onebutton />
// 					<PullRequestFileComments
// 						pr={pr}
// 						setIsLoadingMessage={setIsLoadingMessage}
// 						commentId={derivedState.currentPullRequestCommentId}
// 						quote={() => {}}
// 						onClose={closeFileComments}
// 						prCommitsRange={prCommitsRange}
// 					/>
// 				</PullRequestRoot>
// 			</ThemeProvider>
// 		);
// 	}

// 	return (
// 		<ThemeProvider theme={addViewPreferencesToTheme}>
// 			<PullRequestRoot className="bitbucket" onClick={hijackUserLinks}>
// 				<CreateCodemarkIcons narrow onebutton />
// 				{isLoadingMessage && <FloatingLoadingMessage>{isLoadingMessage}</FloatingLoadingMessage>}
// 				{/* add this back for BB */}
// 				{/* {isEditing && (
// 					<EditPullRequest
// 						pr={pr}
// 						setIsEditing={setIsEditing}
// 						setIsLoadingMessage={setIsLoadingMessage}
// 					/>
// 				)} */}
// 				<Left onClick={closeRight}>
// 					<PRHeader>
// 						<Header>
// 							<div style={{ marginRight: "10px" }}>
// 								<PRStatusButton
// 									disabled
// 									fullOpacity
// 									size="compact"
// 									variant={
// 										pr.isDraft
// 											? "neutral"
// 											: pr.state === "OPEN"
// 											? "success"
// 											: pr.state === "MERGED"
// 											? "merged"
// 											: pr.state === "DECLINED" || pr.state === "SUPERSEDED"
// 											? "destructive"
// 											: "primary"
// 									}
// 								>
// 									{pr.isDraft ? "Draft" : stateMap[pr.state]}
// 								</PRStatusButton>
// 								{pr.discussionLocked && (
// 									<PRStatusButton
// 										className="narrow"
// 										disabled
// 										fullOpacity
// 										size="compact"
// 										variant="warning"
// 									>
// 										<Icon name="lock" style={{ margin: 0 }} />
// 									</PRStatusButton>
// 								)}
// 								{pr.state === "opened" ? "Opened " : "Created "}
// 								<Timestamp
// 									className="no-padding"
// 									time={pr.createdAt}
// 									relative
// 									showTooltip
// 									placement="bottom"
// 								/>{" "}
// 								by <PRHeadshotName person={pr.author} fullName />
// 								<PRActionIcons>
// 									<PRAuthorBadges
// 										pr={pr as unknown as FetchThirdPartyPullRequestPullRequest}
// 										node={pr}
// 									/>
// 								</PRActionIcons>
// 							</div>
// 							{/* TODO: needs to finish merge UI */}

// 							{/* {isMerging && (
// 								<Modal translucent verticallyCenter> */}
// 							{/*modal stuff for merging here*/}

// 							{/* <Dialog
// 										title="Merge this pull request"
// 										onClose={() => setIsMerging(false)}
// 										narrow
// 									>
// 										<UL>
// 											<li>Source</li> */}
// 							{/* <li>{pr.baseRefOid}</li> fix this so it shows the branch name */}
// 							{/* <li>Destination</li>
// 											<li>{pr.headRefOid}</li> */}
// 							{/* fix this so it shows the destination branch (master)*/}
// 							{/* <li>Commit message</li>
// 											<li> */}
// 							{/* <input id="merge_message" type="text" value={} onChange={}
// 												/> */}
// 							{/*put in a message box here */}
// 							{/* </li>
// 										</UL>
// 										<b>Merge strategy</b>
// 										<div style={{ margin: "5px 0" }}>
// 											<InlineMenu
// 												items={[
// 													{
// 														label: "Choose a merge strategy",
// 														key: "choose",
// 														action: () => setIsMergingStrategy("Choose a merge strategy")
// 													},
// 													{
// 														label: "Merge commit",
// 														key: "commit",
// 														action: () => setIsMergingStrategy("Merge commit")
// 													},
// 													{
// 														label: "Squash",
// 														key: "squash",
// 														action: () => setIsMergingStrategy("Squash")
// 													},
// 													{
// 														label: "Fast forward",
// 														key: "fastforward",
// 														action: () => setIsMergingStrategy("Fast forward")
// 													}
// 												]}
// 											>
// 												{isMergingStrategy || "Choose a merge strategy"}
// 											</InlineMenu>
// 										</div>
// 										<Button
// 											fillParent
// 											disabled={
// 												!isMergingStrategy || isMergingStrategy === "Choose a merge strategy"
// 											}
// 											onClick={() => mergePullRequest()} */}
// 							{/* // isLoading={isLoadingMerging} */}
// 							{/* >
// 											Merge this pull request
// 										</Button>
// 									</Dialog>
// 								</Modal>
// 							)} */}

// 							{/* {isDeclining && (
// 								<Modal translucent verticallyCenter> */}
// 							{/*modal stuff for declining here*/}
// 							{/* </Modal>
// 							)} */}

// 							{/* this is the merge/decline drop down*/}
// 							{/* <div style={{ marginLeft: "auto" }}>
// 								<DropdownButton
// 									variant="secondary"
// 									size="compactwide"
// 									splitDropdown
// 									splitDropdownInstantAction
// 									align="dropdownRight"
// 									items={[
// 										{ label: "Merge", key: "merge", action: mergePullRequest },
// 										// { label: "Edit", key: "edit", action: edit },
// 										{ label: "Decline", key: "decline", action: declinePullRequest }
// 									]}
// 								>
// 									...
// 								</DropdownButton>
// 							</div> */}
// 						</Header>
// 						<PRTitle>
// 							{pr.title}{" "}
// 							<Tooltip title="Open on Bitbucket" placement="top" delay={1}>
// 								<span>
// 									<Link href={pr.url}>
// 										!{pr.number}
// 										<Icon name="link-external" className="open-external" />
// 									</Link>
// 								</span>
// 							</Tooltip>
// 						</PRTitle>
// 						{derivedState.currentPullRequest &&
// 							derivedState.currentPullRequest.error &&
// 							derivedState.currentPullRequest.error.message && (
// 								<PRError>
// 									<Icon name="alert" />
// 									<div>{derivedState.currentPullRequest.error.message}</div>
// 								</PRError>
// 							)}
// 					</PRHeader>
// 					<div
// 						className="sticky"
// 						style={{
// 							position: "sticky",
// 							background: "var(--app-background-color)",
// 							zIndex: 20,
// 							top: 0,
// 							paddingTop: "10px",
// 						}}
// 					>
// 						<Tabs style={{ margin: "0 20px 10px 20px", display: "flex", flexWrap: "wrap-reverse" }}>
// 							<Tab onClick={e => setActiveTab(1)} active={activeTab == 1}>
// 								<InlineIcon>
// 									<Icon className="narrow-text" name="comment" />
// 									<span className="wide-text">Overview</span>
// 									<PRBadge>{pr.userDiscussionsCount}</PRBadge>
// 								</InlineIcon>
// 							</Tab>
// 							<Tab onClick={e => setActiveTab(2)} active={activeTab == 2}>
// 								<InlineIcon>
// 									<Icon className="narrow-text" name="git-commit" />
// 									<span className="wide-text">Commits</span>
// 									{/* <PRBadge>{(pr && pr.commitCount) || 0}</PRBadge> */}
// 								</InlineIcon>
// 							</Tab>
// 							{derivedState.isVsIde && (
// 								<Tab onClick={e => setActiveTab(4)} active={activeTab == 4}>
// 									<InlineIcon>
// 										<Icon className="narrow-text" name="plus-minus" />
// 										<span className="wide-text">Changes</span>
// 										<PRBadge>
// 											{(pr && pr.changesCount) || 0}
// 											{pr && pr.overflow ? "+" : ""}
// 										</PRBadge>
// 									</InlineIcon>
// 								</Tab>
// 							)}
// 						</Tabs>
// 					</div>
// 					{!derivedState.composeCodemarkActive && (
// 						<>
// 							{activeTab === 1 && pr && (
// 								<>
// 									{pr.description && (
// 										<Description>
// 											<MarkdownText
// 												text={pr.description
// 													.replace(/<!--[\s\S]*?-->/g, "")
// 													.replace(/<\/?sup>/g, "")}
// 											/>
// 										</Description>
// 									)}
// 									{/*
// 									<SummaryBox pr={pr} openRepos={openRepos} getOpenRepos={getOpenRepos} />
// 									<ApproveBox pr={pr} />
//  									<MergeBox pr={pr} setIsLoadingMessage={setIsLoadingMessage} />
//  									{order === "newest" && bottomComment}
// 									*/}
// 									<Timeline
// 										pr={pr}
// 										setIsLoadingMessage={setIsLoadingMessage}
// 										collapseAll={collapseAll}
// 									/>
// 									{order === "oldest" && bottomComment}
// 								</>
// 							)}
// 							{activeTab === 2 && <PullRequestCommitsTab key={"commits-" + dynamicKey} pr={pr} />}
// 							{activeTab === 4 && (
// 								<PullRequestFilesChangedTab
// 									key={"files-changed-" + dynamicKey}
// 									pr={pr as any}
// 									setIsLoadingMessage={setIsLoadingMessage}
// 									prCommitsRange={prCommitsRange}
// 									setPrCommitsRange={setPrCommitsRange}
// 								/>
// 							)}
// 						</>
// 					)}
// 					{!derivedState.composeCodemarkActive && derivedState.currentPullRequestCommentId && (
// 						<PullRequestFileComments
// 							pr={pr as any}
// 							setIsLoadingMessage={setIsLoadingMessage}
// 							commentId={derivedState.currentPullRequestCommentId}
// 							quote={() => {}}
// 							onClose={closeFileComments}
// 						/>
// 					)}
// 				</Left>
// 			</PullRequestRoot>
// 		</ThemeProvider>
// 	);
// };
