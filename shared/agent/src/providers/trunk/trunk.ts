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
	
	@lspHandler(CheckTrunkRequestType)
	@log()
	async checkRepo(request: CheckTrunkRequest) : Promise<CheckTrunkResponse> {
		try {
			// fully qualified paths
			const fullyQualifiedTrunkPath = path.join(request.cwd, ".trunk");
			const fullyQualifiedExecutable = path.join(fullyQualifiedTrunkPath, "bin", "trunk");
			const fullyQualifiedTrunkConfigurationFile = path.join(fullyQualifiedTrunkPath, "trunk.yaml");
			const fullyQualifiedOutputStateFile = path.join(fullyQualifiedTrunkPath, "codestream-state.json");

			// relative to repo root
			const relativeBinPath = path.join(".trunk", "bin");
			const relativeExecutable = path.join(relativeBinPath, "trunk");
			const relativeOutputStateFile = path.join(".trunk", "codestream-state.json");

			if(!fs.existsSync(fullyQualifiedExecutable)){
				await execAsync(`bash -c "mkdir -p ${relativeBinPath}"`, {
					cwd: request.cwd
				});
				await execAsync(`bash -c "curl -fsSL https://trunk.io/releases/trunk -o ${relativeExecutable}"`, {
					cwd: request.cwd
				});
				await execAsync(`bash -c "chmod u+x ${relativeExecutable}"`, {
					cwd: request.cwd
				});
			}
			
			if(!fs.existsSync(fullyQualifiedTrunkConfigurationFile)){
				await execAsync(`${relativeExecutable} init -n --no-progress`, {
					cwd: request.cwd
				});
			}

			if(!fs.existsSync(fullyQualifiedOutputStateFile)){
				try{
					await execAsync(`${relativeExecutable} check --all --no-fix --output-file="${relativeOutputStateFile}" --no-progress`, {
						cwd: request.cwd
					});
				}
				catch(error){
					// it bombs, but still works?
				}
			}

			if(!fs.existsSync(fullyQualifiedOutputStateFile)){
				throw Error("Output State File Not Found");
			}

			const output = fs.readFileSync(fullyQualifiedOutputStateFile, "utf8");
			// const report = JSON.parse(output);  //type this

			return {
				response: output
			}
		} catch (error) {
			throw new Error(`exception thrown checking repo with Trunk: ${error.message}`);
		}
	}
}