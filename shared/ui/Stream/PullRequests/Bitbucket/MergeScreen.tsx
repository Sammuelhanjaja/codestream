import React, { useState } from "react";
import { api } from "../../../store/providerPullRequests/thunks";
import { useAppDispatch } from "@codestream/webview/utilities/hooks";
import { FetchThirdPartyPullRequestPullRequest } from "@codestream/protocols/agent";

import { Dialog } from "../../../src/components/Dialog";
import { closeModal } from "../../actions";
import Button from "../../Button";
import { TextInput } from "@codestream/webview/Authentication/TextInput";
import { InlineMenu } from "@codestream/webview/src/components/controls/InlineMenu";

interface Props {
	pr: FetchThirdPartyPullRequestPullRequest;
}

export const MergeScreen = (props: Props) => {
	const pr = props;
	const dispatch = useAppDispatch();
	const [mergeMessage, setMergeMessage] = useState("");
	const [mergeMethod, setMergeMethod] = useState("merge_commit");
	const [isCloseSourceBranch, setIsCloseSourceBranch] = useState(false);
	const options = ["merge_commit", "squash", "fast_forward"];

	const mergePullRequest = async () => {
		dispatch(
			api({
				method: "mergePullRequest",
				params: {
					mergeMethod: mergeMethod,
					mergeMessage: mergeMessage,
					closeSourceBranch: isCloseSourceBranch,
				},
			})
		);
	};

	return (
		<Dialog wide title="Merge pull request" onClose={() => dispatch(closeModal())}>
			<form className="standard-form">
				<fieldset className="form-body" style={{ width: "18em", padding: "20px 0" }}>
					<div id="controls">
						<small title="Source"></small>
						<small title="Desitnation"></small>

						<div className="control-group">
							<label>Commit message</label>
							<TextInput name="message" value={mergeMessage} onChange={setMergeMessage} />
						</div>
						<div style={{ margin: "5px 0" }}>
							<InlineMenu
								items={[
									{
										label: "Merge commit",
										key: "merge_commit",
										action: () => setMergeMethod("merge_commit"),
									},
									{
										label: "Squash",
										key: "squash",
										action: () => setMergeMethod("squash"),
									},
									{
										label: "Fast forward",
										key: "fast_forward",
										action: () => setMergeMethod("fast_forward"),
									},
								]}
							>
								{"Merge commit"}
							</InlineMenu>
						</div>

						<Button onClick={() => mergePullRequest()}>Merge</Button>
					</div>
				</fieldset>
			</form>
		</Dialog>
	);
};
