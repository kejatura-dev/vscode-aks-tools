import { type IActionContext } from "@microsoft/vscode-azext-utils";
import { GetPluginsCommandResult } from "copilot-for-azure-vscode-api";
import { manageClusterContextPlugin } from "./context/manageClusterContextPlugin";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getPlugins(_actionContext: IActionContext): Promise<GetPluginsCommandResult> {
    return {
        plugins: [
            manageClusterContextPlugin
        ]
    };
}