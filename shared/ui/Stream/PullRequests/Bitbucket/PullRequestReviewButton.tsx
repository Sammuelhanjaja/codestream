import React, { useMemo, useState } from "react";
import Icon from "../../Icon";
import {
	api,
	getPullRequestConversationsFromProvider,
} from "../../../store/providerPullRequests/thunks";
import { useAppDispatch, useAppSelector } from "@codestream/webview/utilities/hooks";
import {
	FetchThirdPartyPullRequestPullRequest,
	GetReposScmRequestType,
	ReposScm,
	SwitchBranchRequestType,
} from "@codestream/protocols/agent";
import { CodeStreamState } from "@codestream/webview/store";
import { CSMe } from "@codestream/protocols/api";
import {
	clearPullRequestCommits,
	getCurrentProviderPullRequest,
	getCurrentProviderPullRequestLastUpdated,
} from "../../../store/providerPullRequests/slice";
import { getPreferences } from "../../../store/users/reducer";
import * as reviewSelectors from "../../../store/reviews/reducer";
import { HostApi } from "../../../webview-api";
import { logError } from "@codestream/webview/logger";
import { confirmPopup } from "../../Confirm";
import { MergeScreen } from "./MergeScreen";

interface Props {
	pullRequest: FetchThirdPartyPullRequestPullRequest;
}
interface ReposScmPlusName extends ReposScm {
	name: string;
}
const EMPTY_HASH = {};
const EMPTY_ARRAY = [];

export const PullRequestReviewButton = (props: Props) => {
	const dispatch = useAppDispatch();
	const [isOpen, setIsOpen] = useState(false);
	const [title, setTitle] = useState("");
	const [editingTitle, setEditingTitle] = useState(false);
	const [isLoadingBranch, setIsLoadingBranch] = useState(false);
	const [isLoadingPR, setIsLoadingPR] = useState(false);
	const [bbRepo, setBbRepo] = useState<any>(EMPTY_HASH);
	const [savingTitle, setSavingTitle] = useState(false);
	const [isLoadingMessage, setIsLoadingMessage] = useState("");
	const [openRepos, setOpenRepos] = useState<ReposScmPlusName[]>(EMPTY_ARRAY);
	const [currentRepoChanged, setCurrentRepoChanged] = useState(false);

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
			// currentPullRequestCommentId: state.context.currentPullRequest
			// 	? state.context.currentPullRequest.commentId
			// 	: undefined,
			// currentPullRequestSource: state.context.currentPullRequest
			// 	? state.context.currentPullRequest.source
			// 	: undefined,
			// previousPullRequestView: state.context.currentPullRequest
			// 	? state.context.currentPullRequest.previousView
			// 	: undefined,
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

	const cantCheckoutReason = useMemo(() => {
		if (props.pullRequest) {
			// Check for a name match in two places, covers edge case if repo was recently renamed
			const currentRepo = openRepos.find(
				_ =>
					_?.name.toLowerCase() === props.pullRequest.repository?.name?.toLowerCase() ||
					_?.folder?.name?.toLowerCase() === props.pullRequest.repository?.name?.toLowerCase()
			);
			if (!currentRepo) {
				return `You don't have the ${props.pullRequest.repository?.name} repo open in your IDE`;
			}
			if (currentRepo.currentBranch == props.pullRequest.headRefName) {
				return `You are on the ${props.pullRequest.headRefName} branch`;
			}

			// branch is in a fork
			if (props.pullRequest.headRepository?.isFork) {
				return `The source branch for this PR is located on the ${props.pullRequest.headRepositoryOwner?.login}/${props.pullRequest.headRepository?.name} fork`;
			}

			return "";
		} else {
			return "PR not loaded";
		}
	}, [props.pullRequest, openRepos, currentRepoChanged]);

	const checkout = async () => {
		if (!props.pullRequest) return;

		setIsLoadingBranch(true);

		const repoId = derivedState.prRepoId || "";
		const result = await HostApi.instance.send(SwitchBranchRequestType, {
			branch: props.pullRequest!.headRefName,
			repoId: repoId,
		});
		if (result.error) {
			logError(result.error, {
				prRepoId: derivedState.prRepoId,
				branch: props.pullRequest.headRefName,
				repoId: repoId,
				prRepository: props.pullRequest!.repository,
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
		// dispatch(
		// 	clearPullRequestFiles(
		// 		derivedState.currentPullRequestProviderId!,
		// 		derivedState.currentPullRequestId!
		// 	)
		// );
		dispatch(
			clearPullRequestCommits({
				providerId: derivedState.currentPullRequestProviderId!,
				id: derivedState.currentPullRequestId!,
			})
		);
	};

	const _assignState = (pr, src?: string) => {
		if (!pr || !pr.repository) return;
		console.warn("_assignState src", src);
		setBbRepo(pr.repository);
		setTitle(pr.repository.pullRequest.title);
		setEditingTitle(false);
		setSavingTitle(false);
		setIsLoadingPR(false);
		setIsLoadingMessage("");
	};

	const mapping = {
		approve: { icon: "thumbsup", text: "Unapprove", requestedState: "unapprove" }, //this pullrequest is approved
		unapprove: { icon: "thumbsdown", text: "Approve", requestedState: "approve" }, //this pullrequest is unapproved
		"request-changes": {
			icon: "question",
			text: "Request Changes",
			requestedState: "request-changes", //this pull request doesn't already have changes requested
		},
		"changes-requested": {
			icon: "question",
			text: "Changes Requested",
			requestedState: "changes-requested", //this really mean un-request changes (bitbucket button on their UI says changes-requested)
		},
	};

	let approvalStatus;
	let requestStatus;

	const currentUser = props.pullRequest.viewer.id;
	if (props.pullRequest.participants.nodes.length !== 0) {
		const currentUserInfo = props.pullRequest.participants.nodes.find(
			_ => _.user?.account_id === currentUser
		);
		if (currentUserInfo?.approved) {
			approvalStatus = mapping["approve"];
		} else {
			approvalStatus = mapping["unapprove"];
		}
		if (currentUserInfo?.state === "changes_requested") {
			requestStatus = mapping["changes-requested"];
		} else {
			requestStatus = mapping["request-changes"];
		}
	} else {
		approvalStatus = mapping["unapprove"];
		requestStatus = mapping["request-changes"];
	}

	const submitReview = async (value: string) => {
		dispatch(
			api({
				method: "submitReview",
				params: {
					eventType: value,
					pullRequestId: props.pullRequest.id,
					userId: props.pullRequest.viewer.id,
					participants: props.pullRequest.participants.nodes,
				},
			})
		);
	};

	return (
		<>
			{isOpen ? (
				<MergeScreen pr={props.pullRequest}></MergeScreen>
			) : (
				<>
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

					<span className={props.pullRequest.viewerDidAuthor ? "disabled" : ""}>
						<Icon //needs to change to unapprove thumbs down if already approved & needs to not be available if it's their own PR
							name={approvalStatus.icon} //name of the icon to be shown to user; can be either thumbsup or thumbsdown
							title={
								<>
									{approvalStatus.text}
									{props.pullRequest.viewerDidAuthor && (
										<div className="subtle smaller" style={{ maxWidth: "200px" }}>
											Disabled: {`You authored this PR`}
										</div>
									)}
								</>
							} //text that shows to user when they hover, can be either Approve of Unapprove
							trigger={["hover"]}
							delay={1}
							onClick={e => {
								submitReview(approvalStatus.requestedState);
							}}
							placement="bottom"
						/>
					</span>
					<span className={props.pullRequest.viewerDidAuthor ? "disabled" : ""}>
						<Icon // if it's the person's own PR, they cannot request changes, should be grayed out. If changes are requested, it should show that
							name={requestStatus.icon}
							title={
								<>
									{requestStatus.text}
									{props.pullRequest.viewerDidAuthor && (
										<div className="subtle smaller" style={{ maxWidth: "200px" }}>
											Disabled: {`You authored this PR`}
										</div>
									)}
								</>
							} //text that shows to user when hover, can be either Changes Requested or Request Changes
							trigger={["hover"]}
							delay={1}
							placement="bottom"
							onClick={e => {
								submitReview(requestStatus.requestedState);
							}}
						/>
					</span>
					<span>
						<Icon
							className={props.pullRequest.viewerCanUpdate ? "disabled" : ""}
							name="git-merge"
							title="Merge"
							trigger={["hover"]}
							delay={1}
							placement="bottom"
							onClick={e => {
								setIsOpen(true);
							}}
						/>
					</span>
				</>
			)}
			;
		</>
	);
};
