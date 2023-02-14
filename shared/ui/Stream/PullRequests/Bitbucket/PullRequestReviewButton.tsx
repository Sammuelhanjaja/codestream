import React, { useState } from "react";
import Icon from "../../Icon";
import { api } from "../../../store/providerPullRequests/thunks";
import { useAppDispatch, useDidMount } from "@codestream/webview/utilities/hooks";
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

	const [requestType, setRequestType] = useState<{
		icon: string;
		text: string;
		requestedState: string;
	}>(mapping[props.pullRequest.requestStatus]);
	const [approvalType, setApprovalType] = useState<{
		icon: string;
		text: string;
		requestedState: string;
	}>(mapping[props.pullRequest.approvalStatus]);

	useDidMount(() => {
		if (props.pullRequest.approvalStatus === "approve") {
			setApprovalType(mapping["approve"]);
		}
		if (props.pullRequest.approvalStatus === "unapprove") {
			setApprovalType(mapping["unapprove"]);
		}
		if (props.pullRequest.requestStatus === "request-changes") {
			setRequestType(mapping["request-changes"]);
		}
		if (props.pullRequest.requestStatus === "changes-requested") {
			setRequestType(mapping["changes-requested"]);
		}
	});

	const submitReview = async (value: string) => {
		dispatch(
			api({
				method: "submitReview",
				params: {
					eventType: value,
					pullRequestId: props.pullRequest.id,
					userId: props.pullRequest.viewer.id,
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
						submitReview(approvalType.requestedState);
					}}
				>
					<Icon //needs to change to unapprove thumbs down if already approved & needs to not be available if it's their own PR
						name={approvalType.icon} //name of the icon to be shown to user; can be either thumbsup or thumbsdown
						title={approvalType.text} //text that shows to user when they hover, can be either Approve of Unapprove
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
						submitReview(requestType.requestedState);
					}}
				>
					<Icon // if it's the person's own PR, they cannot request changes, should be grayed out. If changes are requested, it should show that
						name={requestType.icon}
						title={requestType.text} //text that shows to user when hover, can be either Changes Requested or Request Changes
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
