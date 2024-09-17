import * as vscode from 'vscode';
import * as path from 'path';
import { getExperimentationServiceAsync, TargetPopulation, IExperimentationTelemetry, IExperimentationService} from 'vscode-tas-client';
import { reporter } from '../commands/utils/reporter';

interface IProductConfiguration {
    quality?: `stable` | `insider` | `exploration`;
}

async function getProductConfig(appRoot: string): Promise<IProductConfiguration> {
    const raw = await vscode.workspace.fs.readFile(vscode.Uri.file(path.join(appRoot, `product.json`)));
    return JSON.parse(raw.toString());
}

interface IPackageConfiguration {
    name: string;
    publisher: string;
    version: string;
}

async function getPackageConfig(packageFolder: string): Promise<IPackageConfiguration> {
    const raw = await vscode.workspace.fs.readFile(vscode.Uri.file(path.join(packageFolder, `package.json`)));
    return JSON.parse(raw.toString());
}

function getTargetPopulation(product: IProductConfiguration): TargetPopulation {
    switch (product.quality) {
        case `stable`: return TargetPopulation.Public;
        case `insider`: return TargetPopulation.Insiders;
        case `exploration`: return TargetPopulation.Internal;
        case undefined: return TargetPopulation.Team;
        default: return TargetPopulation.Public;
    }
}

let experimentationService : IExperimentationService | undefined;
export async function getExperimentationService(context: vscode.ExtensionContext) : Promise<IExperimentationService> {

    //initialize experimentation service when null
    if(!experimentationService){
        const pkg = await getPackageConfig(context.extensionPath);
        const product = await getProductConfig(vscode.env.appRoot);
        const targetPopulation = getTargetPopulation(product);

        experimentationService = await getExperimentationServiceAsync(`${pkg.publisher}.${pkg.name}`, pkg.version, targetPopulation, new ExperimentationTelemetry(), context.globalState)
    }
    return experimentationService;
}


class ExperimentationTelemetry implements IExperimentationTelemetry {
    private readonly sharedProperties: { [key: string]: string } = {};

    /**
     * Implements `postEvent` for `IExperimentationTelemetry`.
     * @param eventName The name of the event
     * @param props The properties to attach to the event
     */
    public postEvent(eventName: string, props: Map<string, string>): void {
        const properties: { [key: string]: string } = {};

        for (const key of props.keys()) {
            properties[key] = <string>props.get(key);
        }

        Object.assign(properties, this.sharedProperties);

        // Treat the TAS query event as activation
        if (/query-expfeature/i.test(eventName)) {
            properties.isActivationEvent = 'true';
        }

        if (reporter) {
            reporter.sendTelemetryErrorEvent(eventName, properties);
        } else {
            throw new Error('Telemetry reporter is not available.');
        }
    }

    /**
     * Implements `setSharedProperty` for `IExperimentationTelemetry`
     * @param name The name of the property
     * @param value The value of the property
     */
    public setSharedProperty(name: string, value: string): void {
        this.sharedProperties[name] = value;
    }
   
}