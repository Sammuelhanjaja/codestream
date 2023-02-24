import { GetObservabilityAnomaliesResponse } from "@codestream/protocols/agent";
import React, { useState } from "react";

import { Row } from "./CrossPostIssueControls/IssuesPane";
import Icon from "./Icon";
import { Link } from "./Link";
import { ObservabilityAnomaliesErrorRateDropdown } from "./ObservabilityAnomaliesErrorRateDropdown";
import { ObservabilityAnomaliesResponseTimeDropdown } from "./ObservabilityAnomaliesResponseTimeDropdown";

interface Props {
	observabilityAnomalies: GetObservabilityAnomaliesResponse;
	observabilityRepo: any;
	// observabilityAssignments: any;
	entityGuid: string;
	noAccess?: string;
}

export const ObservabilityAnomaliesWrapper = React.memo((props: Props) => {
	const [expanded, setExpanded] = useState<boolean>(true);

	return (
		<>
			<Row
				style={{
					padding: "2px 10px 2px 30px",
				}}
				className={"pr-row"}
				onClick={() => setExpanded(!expanded)}
			>
				{expanded && <Icon name="chevron-down-thin" />}
				{!expanded && <Icon name="chevron-right-thin" />}
				<span style={{ marginLeft: "2px" }}>Anomalies</span>
			</Row>
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
