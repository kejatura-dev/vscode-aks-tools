export type CurrentClusterContext = {
    subscriptionId: string;
    clusterName: string;
    clusterId: string;
    resourceGroup: string;
    kubeConfigYAML?: string;
}