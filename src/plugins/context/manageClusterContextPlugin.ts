import { ILocalPluginHandler, LocalPluginArgs, LocalPluginEntry, LocalPluginManifest } from "copilot-for-azure-vscode-api";
import * as vscode from "vscode";
import { failed } from "../../commands/utils/errorable";
import { getReadySessionProvider } from "../../auth/azureAuth";
import * as k8s from "vscode-kubernetes-tools-api";
import { selectSubscriptions } from "../../commands/aksAccount/aksAccount";
import { getFilteredSubscriptions } from "../../commands/utils/config";
import { getClusters, getKubeconfigYaml, getManagedCluster, selectCluster } from "../../commands/utils/clusters";
import { longRunning } from "../../commands/utils/host";
import { CurrentClusterContext } from "../shared/types";
import { createTempFile } from "../../commands/utils/tempfile";
import * as fs from "fs/promises";

const setClusterContextFunctionName = "setClusterContext";
const showClusterContextFunctionName = "showClusterContext";

const manageClusterContextPluginManifest: LocalPluginManifest = {
    name: "manageClusterContextPlugin",
    version: "1.0.0",
    functions: [
        {
            name: setClusterContextFunctionName,
            parameters: [],
            returnParameter: {
                type: "string",
            },
            willHandleUserResponse: false,
        },
        {
            name: showClusterContextFunctionName,
            parameters: [],
            returnParameter: {
                type: "string",
            },
            willHandleUserResponse: false,
        }
    ]
};

let FILEPATH: string | undefined = undefined;

const manageClusterContextPluginHandler: ILocalPluginHandler = {
    execute: async (args: LocalPluginArgs) => {
        const pluginRequest = args.localPluginRequest;

        if (pluginRequest.functionName === setClusterContextFunctionName) {
            const sessionProvider = await getReadySessionProvider();
            const kubectl = await k8s.extension.kubectl.v1;

            if (failed(sessionProvider)) {
                vscode.window.showErrorMessage(sessionProvider.error);
                return { status: "error", message: sessionProvider.error };
            }

            if (!kubectl.available) {
                vscode.window.showWarningMessage(`Kubectl is unavailable.`);
                return { status: "error", message: "Kubectl is unavailable." };
            }

            // allow user to select subscriptions
            await selectSubscriptions();

            // get subscriptions
            const subscriptions = getFilteredSubscriptions();

            // get all clusters in selected subscriptions
            const getClustersPromises = subscriptions.map(o => getClusters(sessionProvider.result, o.subscriptionId));
            const clusters = (await Promise.all(getClustersPromises)).flatMap(r => r);

            const selectedCluster = await selectCluster(clusters);

            if (!selectedCluster) {
                vscode.window.showWarningMessage(`Cluster not selected.`);
                return { status: "cancelled", message: "Cluster is not selected." };
            }

            // get cluster properties
            const properties = await longRunning(`Getting properties for cluster ${selectedCluster.cluster.name}.`, () =>
                getManagedCluster(
                    sessionProvider.result,
                    selectedCluster.cluster.subscriptionId,
                    selectedCluster.cluster.resourceGroup,
                    selectedCluster.cluster.name
                ),
            );
            if (failed(properties)) {
                vscode.window.showErrorMessage(properties.error);
                return { status: "error", message: properties.error };
            }

            // get kubeconfig yaml
            const kubeconfigYaml = await getKubeconfigYaml(
                sessionProvider.result,
                selectedCluster.cluster.subscriptionId,
                selectedCluster.cluster.resourceGroup,
                properties.result,
            );

            if (failed(kubeconfigYaml)) {
                return kubeconfigYaml;
            }

            const currentCluster: CurrentClusterContext = {
                subscriptionId: selectedCluster.cluster.subscriptionId,
                clusterName: selectedCluster.cluster.name,
                clusterId: properties.result.id,
                resourceGroup: selectedCluster.cluster.resourceGroup,
                kubeConfigYAML: kubeconfigYaml.result,
            };

            const file = await createTempFile(JSON.stringify(currentCluster), "json", "current-cluster");
            FILEPATH = file.filePath;

            return { status: "success", message: `Cluster ${selectedCluster.cluster.name} is set as current cluster.` };

        } else if (pluginRequest.functionName === showClusterContextFunctionName) {

            if (!FILEPATH) {
                return { status: "error", message: "Current cluster is not set." };
            }

            const fileContent = await fs.readFile(FILEPATH, "utf-8");
            const parsedCurrentCluster = JSON.parse(fileContent) as CurrentClusterContext;

            return { status: "success", message: `Current cluster : ${parsedCurrentCluster.clusterName}, resource group: ${parsedCurrentCluster.resourceGroup}, subscription: ${parsedCurrentCluster.subscriptionId}` };
        }

        return {
            status: "error",
            message: "Unrecognized command."
        }
    },
};

export const manageClusterContextPlugin: LocalPluginEntry = {
    manifest: manageClusterContextPluginManifest,
    handler: manageClusterContextPluginHandler,
};