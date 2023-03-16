import React, { useEffect, useState } from "react";
import { shallowEqual } from "react-redux";

import { useAppDispatch, useAppSelector } from "@codestream/webview/utilities/hooks";
import { CodeStreamState } from "../store";
import { ErrorRow } from "./Observability";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import Icon from "./Icon";
interface Props {
	observabilityAnomalies?: any;
	observabilityRepo?: any;
	entityGuid?: string;
}

export const ObservabilityAnomaliesErrorRateDropdown = React.memo((props: Props) => {
	const dispatch = useAppDispatch();
	const derivedState = useAppSelector((state: CodeStreamState) => {
		return {
			sessionStart: state.context.sessionStart,
		};
	}, shallowEqual);

	const [expanded, setExpanded] = useState<boolean>(true);
	const [filteredErrors, setFilteredErrors] = useState<any>([]);

	useEffect(() => {
		let _filteredErrorsByRepo = props.observabilityAnomalies.filter(
			oe => oe?.repoId === props?.observabilityRepo?.repoId
		);

		const _filteredErrors = _filteredErrorsByRepo.map(fe => {
			return fe.errors.filter(error => {
				return error.entityId === props.entityGuid;
			});
		});
		setFilteredErrors(_filteredErrors || []);
	}, [props.observabilityAnomalies]);

	//@TODO make this a general utility
	const getRoundedPercentage = number => {
		const factor = Math.pow(10, 2);
		const roundedNumber = Math.floor(number * factor) / factor;
		return `${roundedNumber * 100}`;
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
				<span style={{ marginLeft: "2px" }}>Error Rate</span>
			</Row>
			{expanded && (
				<>
					{props.observabilityAnomalies.length == 0 ? (
						<>
							<ErrorRow customPadding={"0 10px 0 50px"} title={"No anomalies to display"} />
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
