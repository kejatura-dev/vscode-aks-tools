import { GetPluginsCommandResult, LocalPluginEntry } from "copilot-for-azure-vscode-api";
import { manageClusterContextPlugin } from "./context/manageClusterContextPlugin";
import { IExperimentationService } from "vscode-tas-client";

export async function getPlugins(experiementService: IExperimentationService): Promise<GetPluginsCommandResult> {
    const pluginsInternal: LocalPluginEntry[] = [];

    if(experiementService && experiementService.getTreatmentVariable("vscode", "AzureGHCopilotAKS")) {
        pluginsInternal.push(manageClusterContextPlugin);
    }

    return { plugins: pluginsInternal };
}