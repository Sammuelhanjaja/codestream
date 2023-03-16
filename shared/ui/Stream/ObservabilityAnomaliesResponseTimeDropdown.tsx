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
}
export const ObservabilityAnomaliesResponseTimeDropdown = React.memo((props: Props) => {
	const dispatch = useAppDispatch();
	const derivedState = useAppSelector((state: CodeStreamState) => {
		return {
			sessionStart: state.context.sessionStart,
		};
	}, shallowEqual);

	//@TODO make this a general utility
	const getRoundedPercentage = number => {
		const factor = Math.pow(10, 4);
		const roundedNumber = Math.floor(number * factor) / factor;
		return `${roundedNumber * 100}%`;
	};

	const [expanded, setExpanded] = useState<boolean>(true);

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
				<span style={{ marginLeft: "2px" }}>Response Time</span>
			</Row>
			{expanded && (
				<>
					{props.observabilityAnomalies.length == 0 ? (
						<>
							<ErrorRow
								customPadding={"0 10px 0 50px"}
								title={"No anomalies to display"}
							></ErrorRow>
						</>
					) : (
						<>
							{props.observabilityAnomalies.map(anomaly => {
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
										<div style={{ overflow: "visible", marginLeft: "auto", flexGrow: 0 }}>
											<span style={{ width: "10%", textAlign: "right" }}>
												{getRoundedPercentage(anomaly.ratio)}
											</span>
										</div>
									</Row>
								);
							})}
						</>
					)}
				</>
			)}
		</>
	);
});
