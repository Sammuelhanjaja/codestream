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
							{!isChangeTrackingEnabled && (
								<>
									<div style={{ display: "flex" }}>
										<div>Compare data from the last:</div>
										<div style={{ marginLeft: "auto" }}>7 days</div>
									</div>
									<div style={{ display: "flex" }}>
										<div>Against data from the preceding:</div>
										<div style={{ marginLeft: "auto" }}>21 days</div>
									</div>
								</>
							)}
							{isChangeTrackingEnabled && (
								<>
									<div style={{ display: "flex" }}>
										<div>Compare data from the most recent release that is at least:</div>
										<div style={{ marginLeft: "auto" }}>7 days ago</div>
									</div>
									<div style={{ display: "flex" }}>
										<div>Compare data from the last:</div>
										<div style={{ marginLeft: "auto" }}>7 days</div>
									</div>
									<div style={{ display: "flex" }}>
										<div>Against data from the preceding:</div>
										<div style={{ marginLeft: "auto" }}>21 days</div>
									</div>
								</>
							)}
							<div style={{ marginTop: "20px", display: "flex" }}>
								<div>Minimum change to be anomalous:</div>
								<div style={{ marginLeft: "auto" }}>10 %</div>
							</div>
							<div style={{ display: "flex" }}>
								<div>Minimum baseline sample size:</div>
								<div style={{ marginLeft: "auto" }}>30 rpm</div>
							</div>
							<div style={{ display: "flex" }}>
								<div>Minimum error rate:</div>
								<div style={{ marginLeft: "auto" }}>0.1%</div>
							</div>
							<div style={{ display: "flex" }}>
								<div>Minimum average duration:</div>
								<div style={{ marginLeft: "auto" }}>?? ms</div>
							</div>
						</div>
					</fieldset>
				</form>
			</ScrollBox>
		</Dialog>
	);
};
