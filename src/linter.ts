import { spawn } from 'child_process';
import { createInterface } from 'readline';
import * as path from 'path';
import { Configuration } from './configuration';
import { DiagnosticAggregator } from './diagnostics';

export class Linter {

    config: Configuration

    constructor(config : Configuration) {
        this.config = config
    }

    run(paths: string[], workspace: string, logger, diagnostic: DiagnosticAggregator) : Promise<Number> {
        let args: string[] = [];
        args.push('--linelength');
        args.push(this.config.linelength.toString());
        if (this.config.root) {
            args.push('--root');
            let root: string = this.config.root.replace('${workspaceFolder}', workspace);
            root = root.replace('${workspaceFolderBasename}', path.basename(workspace));
            args.push(root);
        }
        if (this.config.filters.length) {
            args.push(`--filters=${this.config.filters.join(',')}`);
        }
        for (let path of paths) {
            args.push(path);
        }
        return new Promise((resolve, reject) => {
            logger.appendLine('Running ament_cpplint ' + args.join(' '));
            const child = spawn(this.config.path, args);
            child.stdout.setEncoding('utf8');
            child.stderr.setEncoding('utf8');
            
            diagnostic.clear();
    
            let stdoutRl = createInterface(child.stdout);
            stdoutRl.on('line', data => {
                logger.appendLine(data);
                diagnostic.addLine(data);
            });
    
            let stderrRl = createInterface(child.stderr);
            stderrRl.on('line', data => {
                logger.appendLine(data);
                diagnostic.addLine(data);
            });
    
            child.on('error', error => {
                logger.appendLine(error);
                reject(error);
            });
            child.on('close', exitCode => {
                logger.appendLine('ament_cpplint exited with code ' + exitCode);
                // ament_cpplint exits with 1 if lint warnings were found
                if ([0, 1].indexOf(exitCode) == -1) {
                    reject(exitCode);
                } else {
                    diagnostic.flush().then(() => {
                        resolve(exitCode);
                    });
                }
            });
        });
    }
}
