import React, { useState } from "react";
import Icon from "../../Icon";
import { api } from "../../../store/providerPullRequests/thunks";
import { useAppDispatch } from "@codestream/webview/utilities/hooks";

interface Props {
	pullRequest: any;
}

export const PullRequestReviewButton = (props: Props) => {
	const dispatch = useAppDispatch();
	const [approvalStatus, setApprovalStatus] = useState<"thumbsup" | "thumbsdown">("thumbsup");
	const [approvalStatusText, setApprovalStatusText] = useState<"Approve" | "Unapprove">("Approve");
	const [requestChangesStatusText, setRequestChangesStatusText] = useState<
		"Request Changes" | "Changes Requested"
	>("Request Changes");
	const [reviewType, setReviewType] = useState<
		"MERGE" | "APPROVE" | "UNAPPROVE" | "REQUEST_CHANGES"
	>("APPROVE");

	//check if user is the same person who authored the PR (props.pullrequest.viewerDidAuthor)
	//if yes, gray out the approve and request changes buttons
	//if it's the person's own PR and changes have been requested by somoene else, there should be some indicator of that -- WHAT DO WE WANT?
	//check if the PR is already approved and by whom (isApproved -> returns false, undefined or true)
	//if yes, it should show thumbsup button and on hover say "unapprove" (approvalStatus & approvalStatusText); (later - participants/reviewers list should show who approved)
	//if no, it should show thumbsdown button and on hover say "approve" (approvalStatus & approvalStatusText);
	//check if the PR already has requested changes
	//if yes, WHAT DO WE WANT HERE? (requestChangesStatusText) (later - participants/reviewers list should show who requested changes)
	//if no, WHAT DO WE WANT HERE? (requestChangesStatusText)

	const submitReview = async () => {
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

	const isPRApproved = () => {
		//returns false, true or undefined
		if (props.pullRequest.participants) {
			const participantLength = props.pullRequest.participants.nodes.length;
			const unapprovedParticipants = props.pullRequest.participants.nodes.find(_ => !_.approved);
			if (unapprovedParticipants) {
				return false;
			}
			const approvedParticipants = props.pullRequest.participants.nodes.filter(
				_ => _.approved && _.state === "approved"
			);
			const isApproved = participantLength == approvedParticipants.length;
			return isApproved;
		}
		return undefined;
	};

	const isChangesRequested = () => {
		if (props.pullRequest.participants) {
			const participantLength = props.pullRequest.participants.nodes.length;
		}
	};

	return (
		<div>
			<span>
				<Icon //needs to change to unapprove thumbs down if already approved & needs to not be available if it's their own PR
					name={approvalStatus} //name of the icon to be shown to user; can be either thumbsup or thumbsdown
					title={approvalStatusText} //text that shows to user when they hover, can be either Approve of Unapprove
					trigger={["hover"]}
					delay={1}
					placement="bottom"
					onClick={e => {
						setReviewType("APPROVE"); //how to do this???
						submitReview(); //how to make this work?
					}}
				/>
			</span>
			<span>
				<Icon // if it's the person's own PR, they cannot request changes, should be grayed out. If changes are requested, it should show that
					name="question"
					title={requestChangesStatusText} //text that shows to user when hover, can be either Changes Requested or Request Changes
					trigger={["hover"]}
					delay={1}
					placement="bottom"
					onClick={e => {
						setReviewType("REQUEST_CHANGES"); //how to do this???
						submitReview();
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
					onClick={() => {
						setReviewType("MERGE"); //how to do this???
						// submitReview();
					}}
				/>
			</span>
		</div>
	);
};
