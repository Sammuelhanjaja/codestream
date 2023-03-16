import { GetObservabilityAnomaliesResponse } from "@codestream/protocols/agent";
import React, { useState } from "react";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import Icon from "./Icon";
import { Link } from "./Link";
import { ObservabilityAnomaliesErrorRateDropdown } from "./ObservabilityAnomaliesErrorRateDropdown";
import { ObservabilityAnomaliesResponseTimeDropdown } from "./ObservabilityAnomaliesResponseTimeDropdown";
import { ErrorRow } from "@codestream/webview/Stream/Observability";
import { useAppDispatch } from "../utilities/hooks";
import { openModal } from "../store/context/actions";
import { WebviewModals } from "../ipc/webview.protocol.common";

interface Props {
	observabilityAnomalies: GetObservabilityAnomaliesResponse;
	observabilityRepo: any;
	// observabilityAssignments: any;
	entityGuid: string;
	noAccess?: string;
}

export const ObservabilityAnomaliesWrapper = React.memo((props: Props) => {
	const [expanded, setExpanded] = useState<boolean>(true);
	const dispatch = useAppDispatch();

	return (
		<>
			<Row
				style={{
					padding: "2px 10px 2px 30px",
				}}
				className={"pr-row"}
				onClick={() => setExpanded(!expanded)}
			>
				<span style={{ paddingTop: "3px" }}>
					{expanded && <Icon name="chevron-down-thin" />}
					{!expanded && <Icon name="chevron-right-thin" />}
				</span>
				<div className="label">
					<span style={{ marginLeft: "2px" }}>Code-Level Metrics</span>
				</div>

				<div className="icons">
					<span
						onClick={e => {
							e.preventDefault();
							e.stopPropagation();
							dispatch(openModal(WebviewModals.CLMSettings));
						}}
					>
						<Icon
							name="gear"
							className="clickable"
							title="Code-Level Metric Settings"
							placement="bottomLeft"
							delay={1}
						/>
					</span>
				</div>
			</Row>

			{expanded && props.observabilityAnomalies.error && (
				<>
					<ErrorRow
						customPadding={"0 10px 0 50px"}
						title={props.observabilityAnomalies.error}
					></ErrorRow>
				</>
			)}

			{expanded &&
				(props.noAccess ? (
					<Row
						style={{
							padding: "2px 10px 2px 40px",
						}}
						className={"pr-row"}
						onClick={() => setExpanded(!expanded)}
					>
						<span style={{ marginLeft: "2px", whiteSpace: "normal" }}>
							{props.noAccess === "403" ? (
								<>
									Your New Relic account doesn’t have access to the anomalies integration with
									CodeStream. Contact your New Relic admin to upgrade your account or{" "}
									<Link
										useStopPropagation={true}
										href="https://docs.newrelic.com/docs/accounts/original-accounts-billing/original-users-roles/user-migration"
									>
										migrate to New Relic’s new user model
									</Link>{" "}
									in order to see errors in CodeStream.
								</>
							) : (
								props.noAccess
							)}
						</span>
					</Row>
				) : (
					<>
						<ObservabilityAnomaliesResponseTimeDropdown
							observabilityAnomalies={props.observabilityAnomalies.responseTime}
							observabilityRepo={props.observabilityRepo}
							entityGuid={props.entityGuid}
						/>
						{/*<ObservabilityAnomaliesThroughputDropdown*/}
						{/*	observabilityAnomalies={props.observabilityAnomalies.throughput}*/}
						{/*	observabilityRepo={props.observabilityRepo}*/}
						{/*	entityGuid={props.entityGuid}*/}
						{/*/>*/}
						<ObservabilityAnomaliesErrorRateDropdown
							observabilityAnomalies={props.observabilityAnomalies.errorRate}
							observabilityRepo={props.observabilityRepo}
							entityGuid={props.entityGuid}
						/>
					</>
				))}
		</>
	);
});
