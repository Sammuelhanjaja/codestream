import { CheckTrunkRequest, CheckTrunkRequestType, CheckTrunkResponse, ThirdPartyProviderConfig } from "@codestream/protocols/agent";
import { log, lspHandler, lspProvider } from "../../system";
import path from "path";
import fs from "fs";
import { ThirdPartyProviderBase } from "providers/thirdPartyProviderBase";
import { exec } from "child_process";
import { promisify } from "util";
import { CodeStreamSession } from "session";
import { strict } from "assert";

export const execAsync = promisify(exec);

@lspProvider("trunk")
export class TrunkProvider extends ThirdPartyProviderBase {

	constructor(
		public readonly session: CodeStreamSession,
		protected readonly providerConfig: ThirdPartyProviderConfig
	) {
		super(session, providerConfig);
	}

	get headers(): { [key: string]: string; } {
		throw new Error("Method not implemented.");
	}

	get displayName() {
		return "Trunk.io";
	}

	get name() {
		return "trunk";
	}
	
	get installPath() {
		return "/usr/local/bin/trunk"; // default install location
	}

	get repoConfigurationFile() {
		return path.join(".trunk", "trunk.yaml"); // default configuration file
	}

	get outputStateFile() {
		return path.join(this.installPath, "codestream-state.json"); // non-default; trying to make sure we don't collide with any other files
	}

	@lspHandler(CheckTrunkRequestType)
	@log()
	async checkRepo(request: CheckTrunkRequest) : Promise<CheckTrunkResponse> {
		try {
			if(!fs.existsSync(this.installPath)){
				await execAsync(`sudo bash -c "mkdir -p /usr/local/bin"`);
				await execAsync(`sudo bash -c "curl -fsSL https://trunk.io/releases/trunk -o ${this.installPath}"`);
				await execAsync(`sudo bash -c "chmod -x ${this.installPath}"`);
			}

			if(!fs.existsSync(this.repoConfigurationFile)){
				await execAsync("trunk init -n --no-progress > /dev/null ");
			}

			await execAsync(`trunk check --all --no-fix --output-file="${this.outputStateFile}" --no-progress > /dev/null`);

			if(!fs.existsSync(this.outputStateFile)){
				throw Error("Output State File Not Found");
			}

			const output = fs.readFileSync(this.outputStateFile, "utf8");
			// const report = JSON.parse(output);  //type this

			return {
				response: output
			}
		} catch (error) {
			throw new Error(`exception thrown checking repo with Trunk: ${error.message}`);
		}
	}
}