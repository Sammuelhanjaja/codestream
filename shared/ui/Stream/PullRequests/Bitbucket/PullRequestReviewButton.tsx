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
		approve: { icon: "thumbsup", text: "Unapprove", requestedState: "unapprove" },
		unapprove: { icon: "thumbsdown", text: "Approve", requestedState: "approve" },
		"request-changes": {
			icon: "question",
			text: "Request Changes",
			requestedState: "request-changes",
		},
		"changes-requested": {
			icon: "question",
			text: "Changes Requested",
			requestedState: "changes-requested",
		},
	};

	const isApproved = props.pullRequest.isApproved;
	const isRequested = props.pullRequest.isRequested;
	const approvalStatus = props.pullRequest.approvalStatus;
	const requestStatus = props.pullRequest.requestStatus;

	useDidMount(() => {
		if (!isApproved && !isRequested) {
			// it's not approved and not requested, should show thumbsdown and text approve as well as question and Request Changes
			setReviewTypeApproval(mapping["unapprove"]);
			setReviewTypeRequest(mapping["request-changes"]);
		} else if (!isApproved && isRequested) {
			//it's not aproved but changes are requested, should show thumbs down and text approve as well as question and Changes Requested
			setReviewTypeApproval(mapping["unapprove"]);
			setReviewTypeRequest(mapping["changes-requested"]);
		} else if (isApproved) {
			setReviewTypeApproval(mapping["approve"]);
			setReviewTypeRequest(mapping["request-changes"]);
		}
	});

	const [reviewTypeApproval, setReviewTypeApproval] = useState<{
		icon: string;
		text: string;
		requestedState: string;
	}>(approvalStatus);
	const [reviewTypeRequest, setReviewTypeRequest] = useState<{
		icon: string;
		text: string;
		requestedState: string;
	}>(requestStatus);

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
						submitReview(reviewTypeApproval.requestedState);
					}}
				>
					<Icon //needs to change to unapprove thumbs down if already approved & needs to not be available if it's their own PR
						name={reviewTypeApproval.icon} //name of the icon to be shown to user; can be either thumbsup or thumbsdown
						title={reviewTypeApproval.text} //text that shows to user when they hover, can be either Approve of Unapprove
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
						submitReview(reviewTypeApproval.requestedState);
					}}
				>
					<Icon // if it's the person's own PR, they cannot request changes, should be grayed out. If changes are requested, it should show that
						name={reviewTypeRequest.icon}
						title={reviewTypeRequest.text} //text that shows to user when hover, can be either Changes Requested or Request Changes
						trigger={["hover"]}
						delay={1}
						placement="bottom"
						onClick={e => {
							submitReview(reviewTypeRequest.requestedState);
						}}
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
