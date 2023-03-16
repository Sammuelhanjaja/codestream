import { useAppDispatch, useAppSelector } from "../utilities/hooks";
import React, { useState } from "react";
import { CodeStreamState } from "../store";
import { closeModal } from "./actions";
import { getTeamSetting } from "../store/teams/reducer";
import ScrollBox from "./ScrollBox";
import { Dialog } from "../src/components/Dialog";

export const CLMSettings = () => {
	const dispatch = useAppDispatch();
	const derivedState = useAppSelector((state: CodeStreamState) => {
		const teamId = state.context.currentTeamId;
		const team = state.teams[teamId];
		const currentUserId = state.session.userId!;
		return {
			teamId,
			team,
			currentUserId,
			createReviewOnCommit: state.preferences.reviewCreateOnCommit !== false,
			reviewApproval: getTeamSetting(team, "reviewApproval"),
			reviewAssignment: getTeamSetting(team, "reviewAssignment"),
		};
	});
	const [loadingApproval, setLoadingApproval] = useState("");
	const [loadingAssignment, setLoadingAssignment] = useState("");

	return (
		<Dialog title="Code-Level Metrics Settings" onClose={() => dispatch(closeModal())}>
			<ScrollBox>
				<form className="standard-form vscroll">
					<fieldset className="form-body">
						<div id="controls"></div>
					</fieldset>
				</form>
			</ScrollBox>
		</Dialog>
	);
};
