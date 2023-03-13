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
	const [isChecked, setIsChecked] = useState(false);
	const [isError, setIsError] = useState(false);
	const options = ["merge_commit", "squash", "fast_forward"];

	const handleChange = () => {
		if (isChecked) {
			setIsChecked(false);
			setIsCloseSourceBranch(false);
		} else {
			setIsChecked(true);
			setIsCloseSourceBranch(true);
		}
	};
	let result;

	const mergePullRequest = async () => {
		result = (await dispatch(
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
			console.log(result.payload.error);
			setIsError(true);
			return result.payload.error;
		} else {
			setIsError(false);
			return;
		}
	};

	return (
		<Modal translucent>
			{isError ? (
				<WarningBox items={[{ message: result.payload.error }]}></WarningBox>
			) : (
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
								<small title="Source">Destination: {props.pr.headRefName} </small>
								<br></br>
								<small title="Desitnation">Source: {props.pr.baseRefName} </small>
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
									<div>
										<label>
											<input type="checkbox" checked={isChecked} onChange={handleChange} />
											Close source branch
										</label>
									</div>
								</div>
								<Button
									onClick={() => {
										mergePullRequest(), props.onClose();
									}}
								>
									Merge
								</Button>
							</div>
						</fieldset>
					</div>
				</Dialog>
			)}
		</Modal>
	);
};
