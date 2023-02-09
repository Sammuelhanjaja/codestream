import React, { useState } from "react";
import Icon from "../../Icon";
import { api } from "../../../store/providerPullRequests/thunks";
import { useAppDispatch, useDidMount } from "@codestream/webview/utilities/hooks";
import { FetchThirdPartyPullRequestPullRequest } from "@codestream/protocols/agent";

interface Props {
	pullRequest: FetchThirdPartyPullRequestPullRequest;
}

export const PullRequestReviewButton = (props: Props) => {
	const dispatch = useAppDispatch();

	const mapping = {
		APPROVED: { icon: "thumbsup", text: "Unapprove" },
		UNAPPROVED: { icon: "thumbsdown", text: "Approve" },
		REQUEST_CHANGES: { icon: "question", text: "Request Changes" },
		CHANGES_REQUESTED: { icon: "question", text: "Changes Requested" },
	};

	const isApproved = props.pullRequest.isApproved;
	const isRequested = props.pullRequest.isRequested;

	useDidMount(() => {
		display_logic();
	});

	const [reviewTypeApprovalIcon, setReviewTypeApprovalIcon] = useState("");
	const [reviewTypeApprovalText, setReviewTypeApprovalText] = useState("");
	const [reviewTypeRequestIcon, setReviewTypeRequestIcon] = useState("");
	const [reviewTypeRequestText, setReviewTypeRequestText] = useState("");

	const display_logic = () => {
		if (!isApproved && !isRequested) {
			// it's not approved and not requested, should show thumbsdown and text approve as well as question and Request Changes
			setReviewTypeApprovalIcon(mapping["UNAPPROVED"].icon);
			setReviewTypeApprovalText(mapping["UNAPPROVED"].text);
			setReviewTypeRequestIcon(mapping["REQUEST_CHANGES"].icon);
			setReviewTypeRequestText(mapping["REQUEST_CHANGES"].text);
		} else if (!isApproved && isRequested) {
			//it's not aproved but changes are requested, should show thumbs down and text approve as well as question and Changes Requested
			setReviewTypeApprovalIcon(mapping["UNAPPROVED"].icon);
			setReviewTypeApprovalText(mapping["UNAPPROVED"].text);
			setReviewTypeRequestIcon(mapping["CHANGES_REQUESTED"].icon);
			setReviewTypeRequestText(mapping["CHANGES_REQUESTED"].text);
		} else if (isApproved) {
			setReviewTypeApprovalIcon(mapping["APPROVED"].icon);
			setReviewTypeApprovalText(mapping["APPROVED"].text);
			setReviewTypeRequestIcon(mapping["REQUEST_CHANGES"].icon);
			setReviewTypeRequestText(mapping["REQUEST_CHANGES"].text);
		}
	};

	const submitReview = async user_click => {
		let reviewType;
		if (user_click === "Approve") {
			reviewType = "APPROVE";
		} else if (user_click === "Unapprove") {
			reviewType = "UNAPPROVE";
		} else if (user_click === "Request Changes") {
			reviewType = "REQUEST_CHANGES";
		} else if (user_click === "Changes Requested") {
			reviewType = "CHANGES_REQUESTED";
		}

		if (!props.pullRequest.viewerDidAuthor) {
			await dispatch(
				api({
					method: "submitReview",
					params: {
						eventType: reviewType,
						pullRequestId: props.pullRequest.id,
					},
				})
			);
		}
	};

	return (
		<div>
			<span>
				<Icon //needs to change to unapprove thumbs down if already approved & needs to not be available if it's their own PR
					name={reviewTypeApprovalIcon} //name of the icon to be shown to user; can be either thumbsup or thumbsdown
					title={reviewTypeApprovalText} //text that shows to user when they hover, can be either Approve of Unapprove
					trigger={["hover"]}
					delay={1}
					placement="bottom"
					onClick={e => {
						submitReview(reviewTypeApprovalText);
					}}
				/>
			</span>
			<span>
				<Icon // if it's the person's own PR, they cannot request changes, should be grayed out. If changes are requested, it should show that
					name={reviewTypeRequestIcon}
					title={reviewTypeRequestText} //text that shows to user when hover, can be either Changes Requested or Request Changes
					trigger={["hover"]}
					delay={1}
					placement="bottom"
					onClick={e => {
						submitReview(reviewTypeRequestText);
					}}
				/>
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
