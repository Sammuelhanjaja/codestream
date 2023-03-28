import React from "react";
import Button from "../Button";

import {
	ReposScm,
	CheckTrunkRequestType,
} from "@codestream/protocols/agent";

import { HostApi } from "../../webview-api";

interface Props {
	currentRepo: ReposScm;
}

export const ConnectCICD = (props: Props) => {
	const check = async() =>{
		try {
			var path = props?.currentRepo?.path;
			const result = await HostApi.instance.send(CheckTrunkRequestType, {
				cwd: path
			 });
		} catch (error) {
			throw new Error(`exception thrown checking repo with Trunk: ${error.message}`);
		}
	}

	return (
		<>
			<Button onClick={() => check()}>Run Check</Button>
		</>
	);
};
