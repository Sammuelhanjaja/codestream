import { useAppDispatch, useAppSelector } from "../utilities/hooks";
import React, { useState } from "react";
import { CodeStreamState } from "../store";
import { closeModal } from "./actions";
import ScrollBox from "./ScrollBox";
import { Dialog } from "../src/components/Dialog";
import { Dropdown } from "../Stream/Dropdown";
import Button from "./Button";

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
	const [compareDataLastValue, setCompareDataLastValue] = useState("7");
	const [againstDataPrecedingValue, setAgainstDataPrecedingValue] = useState("21");
	const [minimumChangeValue, setMinimumChangeValue] = useState("10");
	const [minimumBaselineValue, setMinimumBaselineValue] = useState("30");
	const [minimumErrorRateValue, setMinimumErrorRateValue] = useState("0.1");
	const [minimumAverageDurationValue, setMinimumAverageDurationValue] = useState("10");
	const compareDataLastItems = [
		{
			label: "7",
			key: "7",
			action: () => setCompareDataLastValue("7"),
		},
		{
			label: "14",
			key: "14",
			action: () => setCompareDataLastValue("14"),
		},
		{
			label: "21",
			key: "21",
			action: () => setCompareDataLastValue("21"),
		},
		{
			label: "28",
			key: "28",
			action: () => setCompareDataLastValue("28"),
		},
	];
	const againstDataPrecedingItems = [
		{
			label: "21",
			key: "21",
			action: () => setCompareDataLastValue("21"),
		},
		{
			label: "28",
			key: "28",
			action: () => setCompareDataLastValue("28"),
		},
		{
			label: "35",
			key: "35",
			action: () => setCompareDataLastValue("35"),
		},
		{
			label: "42",
			key: "42",
			action: () => setCompareDataLastValue("42"),
		},
	];

	const handleClickSubmit = () => {
		console.warn("Submit button clicked");
	};

	const handleNumberChange = e => {
		let { value, min, max, name } = e.target;
		value = Math.max(Number(min), Math.min(Number(max), Number(value)));
		switch (name) {
			case "min-change":
				setMinimumChangeValue(value);
				break;
			case "min-baseline":
				setMinimumBaselineValue(value);
				break;
			case "min-error-rate":
				setMinimumErrorRateValue(value);
				break;
			case "min-average-duration":
				setMinimumAverageDurationValue(value);
				break;
			default:
				throw new Error("Invalid input name");
		}
	};

	return (
		<Dialog wide title="Code-Level Metrics Settings" onClose={() => dispatch(closeModal())}>
			<ScrollBox>
				<form className="standard-form vscroll">
					<fieldset className="form-body">
						<div id="controls">
							{!isChangeTrackingEnabled && (
								<>
									<div style={{ display: "flex", marginTop: "10px" }}>
										<div>Compare data from the last:</div>
										<div style={{ marginLeft: "auto" }}>
											<Dropdown
												selectedValue={compareDataLastValue}
												items={compareDataLastItems}
												noModal={true}
											/>{" "}
											days
										</div>
									</div>
									<div style={{ display: "flex", marginTop: "5px" }}>
										<div>Against data from the preceding:</div>
										<div style={{ marginLeft: "auto" }}>
											<Dropdown
												selectedValue={againstDataPrecedingValue}
												items={againstDataPrecedingItems}
												noModal={true}
											/>{" "}
											days
										</div>
									</div>
								</>
							)}
							{isChangeTrackingEnabled && (
								<>
									<div style={{ display: "flex", marginTop: "10px" }}>
										<div>Compare data from the most recent release that is at least:</div>
										<div style={{ marginLeft: "auto" }}>7 days ago</div>
									</div>
									<div style={{ display: "flex" }}>
										<div>Compare data from the last:</div>
										<div style={{ marginLeft: "auto" }}>
											<Dropdown
												selectedValue={compareDataLastValue}
												items={compareDataLastItems}
												noModal={true}
											/>
										</div>
									</div>
									<div style={{ display: "flex" }}>
										<div>Against data from the preceding:</div>
										<div style={{ marginLeft: "auto" }}>
											<Dropdown
												selectedValue={againstDataPrecedingValue}
												items={againstDataPrecedingItems}
												noModal={true}
											/>
										</div>
									</div>
								</>
							)}
							<div style={{ marginTop: "20px", display: "flex" }}>
								<div>Minimum change to be anomalous:</div>
								<div style={{ marginLeft: "auto" }}>
									<input
										name="min-change"
										type="number"
										min="1"
										max="100"
										value={minimumChangeValue}
										onChange={e => handleNumberChange(e)}
									/>
								</div>
								<div style={{ marginLeft: "5px", width: "24px", paddingTop: "2px" }}>%</div>
							</div>
							<div style={{ marginTop: "5px", display: "flex" }}>
								<div>Minimum baseline sample size:</div>
								<div style={{ marginLeft: "auto" }}>
									<input
										name="min-baseline"
										type="number"
										min="1"
										max="100"
										value={minimumBaselineValue}
										onChange={e => handleNumberChange(e)}
									/>
								</div>
								<div style={{ marginLeft: "5px", width: "24px", paddingTop: "2px" }}>rpm</div>
							</div>
							<div style={{ marginTop: "5px", display: "flex" }}>
								<div>Minimum error rate:</div>
								<div style={{ marginLeft: "auto" }}>
									<input
										name="min-error-rate"
										type="number"
										min="1"
										max="100"
										value={minimumErrorRateValue}
										onChange={e => handleNumberChange(e)}
									/>
								</div>
								<div style={{ marginLeft: "5px", width: "24px", paddingTop: "2px" }}>%</div>
							</div>
							<div style={{ marginTop: "5px", display: "flex" }}>
								<div>Minimum average duration:</div>
								<div style={{ marginLeft: "auto" }}>
									<input
										name="min-average-duration"
										type="number"
										min="1"
										max="100"
										value={minimumAverageDurationValue}
										onChange={e => handleNumberChange(e)}
									/>
								</div>
								<div style={{ marginLeft: "5px", width: "24px", paddingTop: "2px" }}>ms</div>
							</div>
							<div style={{ margin: "30px 0 10px 0" }} className="button-group">
								<Button
									style={{ width: "100px" }}
									className="control-button cancel"
									type="button"
									onClick={() => dispatch(closeModal())}
								>
									Cancel
								</Button>
								<Button
									style={{ width: "100px" }}
									className="control-button"
									type="button"
									loading={false}
									onClick={() => handleClickSubmit()}
								>
									Submit
								</Button>
							</div>
						</div>
					</fieldset>
				</form>
			</ScrollBox>
		</Dialog>
	);
};
