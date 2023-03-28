import React from "react";
import Button from "../Button";

import {
	ReposScm,
	CheckTrunkRequestType,
} from "@codestream/protocols/agent";

import { HostApi } from "../../webview-api";

export const ConnectCICD = () => {
	const check = async() =>{
		try {
			const result = await HostApi.instance.send(CheckTrunkRequestType,{});
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
