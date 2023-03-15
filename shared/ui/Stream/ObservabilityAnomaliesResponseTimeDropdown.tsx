import React, { useState } from "react";
import { shallowEqual } from "react-redux";

import { useAppDispatch, useAppSelector } from "@codestream/webview/utilities/hooks";
import { CodeStreamState } from "../store";
import { ErrorRow } from "./Observability";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import Icon from "./Icon";
import { HostApi } from "@codestream/webview/webview-api";
import {
	EditorRevealSymbolRequestType,
	WebviewPanels,
} from "@codestream/protocols/webview";
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

	const [expanded, setExpanded] = useState<boolean>(true);
	// const [filteredErrors, setFilteredErrors] = useState<any>([]);

	// useEffect(() => {
	// 	let _filteredErrorsByRepo = props.observabilityAnomalies.filter(
	// 		oe => oe?.repoId === observabilityRepo?.repoId
	// 	);
	//
	// 	const _filteredErrors = _filteredErrorsByRepo.map(fe => {
	// 		return fe.errors.filter(error => {
	// 			return error.entityId === props.entityGuid;
	// 			// if (error.entityId === props.entityGuid) {
	// 			// 	return error;
	// 			// }
	// 		});
	// 	});
	// 	setFilteredErrors(_filteredErrors || []);
	// }, [props.observabilityAnomalies]);

	// useDidMount(() => {});
	// useEffect(() => {}, []);

	const { observabilityAnomalies, observabilityRepo } = props;

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
											dispatch(setCurrentObservabilityAnomaly(anomaly));
											dispatch(openPanel(WebviewPanels.MethodLevelTelemetry));
											// dispatch(
											// 	openErrorGroup(err.errorGroupGuid, err.occurrenceId, {
											// 		timestamp: err.lastOccurrence,
											// 		remote: observabilityRepo.repoRemote,
											// 		sessionStart: derivedState.sessionStart,
											// 		pendingEntityId: err.entityId,
											// 		occurrenceId: err.occurrenceId,
											// 		pendingErrorGroupGuid: err.errorGroupGuid,
											// 		src: "Observability Section",
											// 	})
											// );
										}}
									>
										<div />
										<div style={{ textAlign: "right", marginRight: "5px", direction: "rtl" }}>
											<span>{anomaly.text}</span>
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
