import { useAppDispatch, useAppSelector } from "../utilities/hooks";
import React, { useState } from "react";
import { CodeStreamState } from "../store";
import { closeModal } from "./actions";
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
		};
	});
	const [isChangeTrackingEnabled, setIsChangeTrackingEnabled] = useState(false);

	return (
		<Dialog title="Code-Level Metrics Settings" onClose={() => dispatch(closeModal())}>
			<ScrollBox>
				<form className="standard-form vscroll">
					<fieldset className="form-body">
						<div id="controls">
							{!isChangeTrackingEnabled && <div>Change tracking disabled</div>}
							{isChangeTrackingEnabled && <div>Change tracking enabled</div>}
						</div>
					</fieldset>
				</form>
			</ScrollBox>
		</Dialog>
	);
};
