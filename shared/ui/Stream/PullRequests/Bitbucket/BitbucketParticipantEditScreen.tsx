import React, { useState } from "react";
import { Modal } from "../../Modal";
import { FetchThirdPartyPullRequestPullRequest } from "@codestream/protocols/agent";

interface Props {
	pr: FetchThirdPartyPullRequestPullRequest;
	onClose: Function;
	addOrRemove: string;
}

export const BitbucketParticipantEditScreen = (props: Props) => {
	const pr = props;
	const [isAdd, setIsAdd] = useState(false);

	if (props.addOrRemove === "add") {
		setIsAdd(true);
	}

	return <Modal translucent>{isAdd ? <></> : <></>}</Modal>;
};
