'use strict';

import * as vscode from 'vscode';
import { lookpath } from 'lookpath';
import * as fs from 'fs';
const fsPromises = fs.promises;

export interface Configuration {
    path: string;
    linelength: Number;
    filters: string[];
    root: string;
}

export class ConfigurationError extends Error {

}

const defaultConfiguration = {
    path: 'ament_cpplint',
    linelength: 80,
    filters: [],
    root: ''
};

export async function getConfiguration(settings: vscode.WorkspaceConfiguration): Promise<Configuration> {
    if (!settings) {
        return defaultConfiguration;
    }
    let path = settings.get('path', defaultConfiguration.path);

    if (!await lookpath(path)) {
        path = null;
        let distros = await fsPromises.readdir('/opt/ros');
        for (let distro of distros) {
            let candidate = `/opt/ros/${distro}/bin/ament_cpplint`;
            try {
                await fsPromises.access(candidate, fs.constants.X_OK);
                path = candidate;
                break;
            } catch (e) { //ignore
            }
        }
        if (!path) {
            throw new ConfigurationError('could not find ament_cpplint executable')
        }
    }

    let linelength = settings.get('linelength', defaultConfiguration.linelength);
    let filters = settings.get('filters', defaultConfiguration.filters);

    filters.forEach(filter => {
        if (['-', '+'].indexOf(filter[0]) == -1) {
            throw new ConfigurationError('invalid settings: filter \'' + filter + '\' must start with + or -');
        }
    });

    let root = settings.get('root', defaultConfiguration.root);
    return {
        path,
        linelength,
        filters,
        root
    }
}
