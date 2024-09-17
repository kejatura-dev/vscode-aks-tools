import { QuickPickItem,  window } from "vscode";
import { Cluster } from "../utils/clusters";

type ClusterQuickPickItem = QuickPickItem & { cluster: Cluster };

export async function selectCluster(clusters: Cluster[]): Promise<ClusterQuickPickItem|undefined> {

    const quickPickItems: ClusterQuickPickItem[] = clusters.map((cluster) => {
        return {
            label: cluster.name || "",
            description: cluster.clusterId,
            cluster: {
                clusterId: cluster.clusterId,
                name: cluster.name,
                resourceGroup: cluster.resourceGroup,
                subscriptionId: cluster.subscriptionId
            }
        };
    });

    const selectedItem = await window.showQuickPick(quickPickItems, {
        canPickMany: false,
        placeHolder: "Select Cluster",
    });

    if (!selectedItem) {
        return undefined;
    }
    
    return selectedItem;
}
