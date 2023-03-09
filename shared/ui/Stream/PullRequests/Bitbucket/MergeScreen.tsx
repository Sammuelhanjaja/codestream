import React, { useState } from "react";
import { api } from "../../../store/providerPullRequests/thunks";
import { useAppDispatch } from "@codestream/webview/utilities/hooks";
import { FetchThirdPartyPullRequestPullRequest } from "@codestream/protocols/agent";

import { Dialog } from "../../../src/components/Dialog";
import Button from "../../Button";
import { InlineMenu } from "@codestream/webview/src/components/controls/InlineMenu";
import { Modal } from "../../Modal";
import { WarningBox } from "../../WarningBox";

interface Props {
	pr: FetchThirdPartyPullRequestPullRequest;
	onClose: Function;
}

export const MergeScreen = (props: Props) => {
	const pr = props;
	const dispatch = useAppDispatch();
	const [mergeMessage, setMergeMessage] = useState("");
	const [mergeMethod, setMergeMethod] = useState("merge_commit");
	const [mergeSelection, setMergeSelection] = useState("Merge commit");
	const [isCloseSourceBranch, setIsCloseSourceBranch] = useState(false);
	const options = ["merge_commit", "squash", "fast_forward"];

	const mergePullRequest = async () => {
		const result = (await dispatch(
			api({
				method: "mergePullRequest",
				params: {
					mergeMethod: mergeMethod,
					mergeMessage: mergeMessage,
					closeSourceBranch: isCloseSourceBranch,
					prParticipants: props.pr.participants,
				},
			})
		)) as any;
		if (result.payload.error) {
			return <WarningBox items={[result.payload.error]}></WarningBox>;
		} else {
			return;
		}
	};

	return (
		<Modal translucent>
			<Dialog
				narrow
				title="Merge pull request"
				onClose={() => {
					props.onClose();
				}}
			>
				<div className="standard-form">
					<fieldset className="form-body">
						<div id="controls">
							<small title="Source">Merge {props.pr.headRefName} into </small>
							<small title="Desitnation">{props.pr.baseRefName}</small>
							<div style={{ margin: "20px 0" }}>
								<div className="controls">
									<label>Commit message</label>
									<input
										autoFocus
										placeholder="your commit message"
										className="input-text control"
										type="text"
										name="message"
										value={mergeMessage}
										onChange={e => {
											setMergeMessage(e.target.value);
										}}
									/>

									<InlineMenu
										items={[
											{
												label: "Merge commit",
												key: "merge_commit",
												action: () => {
													setMergeMethod("merge_commit"), setMergeSelection("Merge commit");
												},
											},
											{
												label: "Squash",
												key: "squash",
												action: () => {
													setMergeMethod("squash"), setMergeSelection("Squash");
												},
											},
											{
												label: "Fast forward",
												key: "fast_forward",
												action: () => {
													setMergeMethod("fast_forward"), setMergeSelection("Fast forward");
												},
											},
										]}
									>
										{mergeSelection}
									</InlineMenu>
									<div style={{ height: "10px" }} />
								</div>
							</div>

							<Button onClick={() => mergePullRequest()}>Merge</Button>
						</div>
					</fieldset>
				</div>
			</Dialog>
		</Modal>
	);
};
