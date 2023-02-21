import React from "react";
import Icon from "../../Icon";
import { api } from "../../../store/providerPullRequests/thunks";
import { useAppDispatch } from "@codestream/webview/utilities/hooks";
import { FetchThirdPartyPullRequestPullRequest } from "@codestream/protocols/agent";
import Button from "../../Button";

interface Props {
	pullRequest: FetchThirdPartyPullRequestPullRequest;
}

export const PullRequestReviewButton = (props: Props) => {
	const dispatch = useAppDispatch();

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
		if (currentUserInfo?.state) {
			requestStatus = mapping["changes-requested"];
		} else {
			requestStatus = mapping["request-changes"];
		}
	} else {
		approvalStatus = mapping["unapprove"];
		requestStatus = mapping["request-changes"];
	}

	// const [requestType, setRequestType] = useState<{
	// 	icon: string;
	// 	text: string;
	// 	requestedState: string;
	// }>(initialRequestStatus);
	// const [approvalType, setApprovalType] = useState<{
	// 	icon: string;
	// 	text: string;
	// 	requestedState: string;
	// }>(initialApprovalStatus);

	// useDidMount(() => {
	// 	//check if the viewer has already approved this pull request or not
	// 	const currentUser = props.pullRequest.viewer.id;
	// 	if (props.pullRequest.participants.nodes.length !== 0) {
	// 		const currentUserInfo = props.pullRequest.participants.nodes.find(
	// 			_ => _.user?.account_id === currentUser
	// 		);
	// 		if (currentUserInfo?.approved) {
	// 			setApprovalType(mapping["approve"]); //user has already approved this pullrequest
	// 		} else {
	// 			setApprovalType(mapping["unapprove"]); //user has not approved this pullrequest
	// 		}
	// 		if (currentUserInfo?.state === "changes-requested") {
	// 			setRequestType(mapping["changes-requested"]); //user has requested changes on this pull request
	// 		} else {
	// 			setRequestType(mapping["request-changes"]); //user has not requested changes on this pull request already
	// 		}
	// 	} else {
	// 		setApprovalType(mapping["unapprove"]); //if this user isn't in the participants list yet, then they haven't approved
	// 		setRequestType(mapping["request-changes"]); //if this user isn't in the participants list yet, then they haven't requeted changes
	// 	}
	// });

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
		<div>
			<span>
				<Button
					disabled={props.pullRequest.viewerDidAuthor}
					onClick={e => {
						submitReview(approvalStatus.requestedState);
					}}
				>
					<Icon //needs to change to unapprove thumbs down if already approved & needs to not be available if it's their own PR
						name={approvalStatus.icon} //name of the icon to be shown to user; can be either thumbsup or thumbsdown
						title={approvalStatus.text} //text that shows to user when they hover, can be either Approve of Unapprove
						trigger={["hover"]}
						delay={1}
						placement="bottom"
					/>
				</Button>
			</span>
			<span>
				<Button
					disabled={props.pullRequest.viewerDidAuthor}
					onClick={e => {
						submitReview(requestStatus.requestedState);
					}}
				>
					<Icon // if it's the person's own PR, they cannot request changes, should be grayed out. If changes are requested, it should show that
						name={requestStatus.icon}
						title={requestStatus.text} //text that shows to user when hover, can be either Changes Requested or Request Changes
						trigger={["hover"]}
						delay={1}
						placement="bottom"
					/>
				</Button>
			</span>
			<span>
				<Icon // This will be a whole separate thing
					name="git-merge"
					title="Merge"
					trigger={["hover"]}
					delay={1}
					placement="bottom"
					onClick={e => {
						// setReviewTypeHandler("Merge");
						// submitReview();
					}}
				/>
			</span>
		</div>
	);
};
