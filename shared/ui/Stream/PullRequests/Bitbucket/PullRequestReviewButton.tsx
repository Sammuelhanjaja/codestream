import React, { useState } from "react";
import Icon from "../../Icon";
import { api } from "../../../store/providerPullRequests/thunks";
import { useAppDispatch } from "@codestream/webview/utilities/hooks";

interface Props {
	pullRequest: any;
}

export const PullRequestReviewButton = (props: Props) => {
	const dispatch = useAppDispatch();
	const [reviewType, setReviewType] = useState<
		"MERGE" | "APPROVE" | "UNAPPROVE" | "REQUEST_CHANGES"
	>("APPROVE");
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

	return (
		<div>
			{/* Hello World ${props.pullRequest.something} */}

			<span>
				<Icon //needs to change to unapprove thumbs down if already approved & needs to not be available if it's their own PR
					name={isPRApproved() ? "thumbsup" : "thumbsdown"}
					title={isPRApproved() ? "Approve" : "Unapprove"} //TODO: not working
					trigger={["hover"]}
					delay={1}
					placement="bottom"
					onClick={e => {
						setReviewType("APPROVE");
						submitReview();
					}}
					// className={`${isLoadingPR ? "spin" : ""}`}
				/>
			</span>
			<span>
				<Icon
					name="comment"
					title="Merge"
					trigger={["hover"]}
					delay={1}
					placement="bottom"
					// className={`${isLoadingPR ? "spin" : ""}`}
				/>
			</span>
			<span>
				<Icon //if this person already requested changes, make not available
					name="question"
					title="Request Changes"
					trigger={["hover"]}
					delay={1}
					placement="bottom"
					onClick={() => {
						setReviewType("REQUEST_CHANGES");
						// submitReview(true)
					}}
					// className={`${isLoadingPR ? "spin" : ""}`}
				/>
			</span>
		</div>
	);
};
