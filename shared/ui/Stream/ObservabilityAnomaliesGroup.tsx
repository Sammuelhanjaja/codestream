import React, { useState } from "react";
import { shallowEqual } from "react-redux";

import { useAppDispatch, useAppSelector } from "@codestream/webview/utilities/hooks";
import { CodeStreamState } from "../store";
import { ErrorRow } from "./Observability";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import Icon from "./Icon";
import { HostApi } from "@codestream/webview/webview-api";
import { EditorRevealSymbolRequestType, WebviewPanels } from "@codestream/protocols/webview";
import {
	closeAllPanels,
	openPanel,
	setCurrentObservabilityAnomaly,
} from "@codestream/webview/store/context/actions";
interface Props {
	observabilityAnomalies?: any;
	observabilityRepo?: any;
	entityGuid?: string;
	title?: string;
}
export const ObservabilityAnomaliesGroup = React.memo((props: Props) => {
	const dispatch = useAppDispatch();
	const derivedState = useAppSelector((state: CodeStreamState) => {
		const clmSettings = state.preferences.clmSettings || {};
		return {
			clmSettings,
		};
	}, shallowEqual);
	const [expanded, setExpanded] = useState<boolean>(true);
	const [showMoreExpanded, setShowMoreExpanded] = useState<boolean>(false);
	const primaryAnomalies = props.observabilityAnomalies?.slice(0, 5);
	const secondaryAnomalies = props.observabilityAnomalies?.slice(5, 10);

	const getRoundedPercentageOutput = ratio => {
		const percentage = (ratio - 1) * 100;
		const factor = Math.pow(10, 2);
		const roundedPercentage = Math.floor(percentage * factor) / factor;
		let roundedPercentageText =
			roundedPercentage > 0 ? `+${roundedPercentage}%` : `${roundedPercentage}%`;

		return (
			<div style={{ overflow: "visible", marginLeft: "auto", flexGrow: 0 }}>
				<span
					style={{
						color:
							roundedPercentage > derivedState.clmSettings.minimumChangeValue ? "red" : "default",
						width: "10%",
						textAlign: "right",
					}}
				>
					{roundedPercentageText}
				</span>
			</div>
		);
	};

	return (
		<>
			<Row
				style={{
					padding: "2px 10px 2px 40px",
				}}
				className={"pr-row"}
				onClick={() => setExpanded(!expanded)}
			>
				{expanded && <Icon name="chevron-down-thin" />}
				{!expanded && <Icon name="chevron-right-thin" />}
				<span style={{ marginLeft: "2px" }}>{props.title}</span>
			</Row>
			{expanded && (
				<>
					{primaryAnomalies.length == 0 ? (
						<>
							<ErrorRow
								customPadding={"0 10px 0 50px"}
								title={"No anomalies to display"}
							></ErrorRow>
						</>
					) : (
						<>
							{primaryAnomalies.map(anomaly => {
								return (
									<Row
										style={{
											padding: "0 10px 0 42px",
										}}
										className={"pr-row"}
										onClick={e => {
											HostApi.instance.send(EditorRevealSymbolRequestType, {
												className: anomaly.className,
												functionName: anomaly.functionName,
											});
											dispatch(closeAllPanels());
											dispatch(setCurrentObservabilityAnomaly(anomaly, props.entityGuid!));
											dispatch(openPanel(WebviewPanels.ObservabilityAnomaly));
										}}
									>
										<div
											style={{
												width: "85%",
												textAlign: "left",
												marginRight: "5px",
												direction: "rtl",
											}}
										>
											<span>{anomaly.text}</span>
										</div>
										{getRoundedPercentageOutput(anomaly.ratio)}
									</Row>
								);
							})}
						</>
					)}
					{secondaryAnomalies.length > 0 && (
						<>
							{!showMoreExpanded && (
								<div
									style={{ padding: "0px 10px 0px 58px", cursor: "pointer" }}
									onClick={() => setShowMoreExpanded(true)}
								>
									Show More
								</div>
							)}
							{showMoreExpanded && (
								<>
									{secondaryAnomalies.map(anomaly => {
										return (
											<Row
												style={{
													padding: "0 10px 0 42px",
												}}
												className={"pr-row"}
												onClick={e => {
													HostApi.instance.send(EditorRevealSymbolRequestType, {
														className: anomaly.className,
														functionName: anomaly.functionName,
													});
													dispatch(closeAllPanels());
													dispatch(setCurrentObservabilityAnomaly(anomaly, props.entityGuid!));
													dispatch(openPanel(WebviewPanels.ObservabilityAnomaly));
												}}
											>
												<div
													style={{
														width: "85%",
														textAlign: "left",
														marginRight: "5px",
														direction: "rtl",
													}}
												>
													<span>{anomaly.text}</span>
												</div>
												{getRoundedPercentageOutput(anomaly.ratio)}
											</Row>
										);
									})}
								</>
							)}
						</>
					)}
				</>
			)}
		</>
	);
});
