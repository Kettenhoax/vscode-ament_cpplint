'use strict';
import * as vscode from 'vscode';
import { Linter } from './linter';
import { DiagnosticAggregator } from './diagnostics';
import { getConfiguration, ConfigurationError } from './configuration';

let outputChannel: vscode.OutputChannel;
let diagnosticCollection: vscode.DiagnosticCollection = vscode.languages.createDiagnosticCollection('ament_cpplint');
let linter: Linter;

function isSupportedLanguage(languageId: string): boolean {
    return ['cpp', 'c'].indexOf(languageId) >= 0
}

function runLint(document: vscode.TextDocument): Promise<Number> {
    if (isSupportedLanguage(document.languageId)) {
        let uri = document.uri;
        let workspacefolder = vscode.workspace.getWorkspaceFolder(uri)
        let workspace = workspacefolder.uri.fsPath;
        let diagnostics = new DiagnosticAggregator(diagnosticCollection);
        return linter.run([uri.fsPath], workspace, outputChannel, diagnostics);
    }
    return Promise.resolve(0);
};

function runOnFile(): Promise<Number> {
    var edit = vscode.window.activeTextEditor;
    if (edit == undefined) {
        return Promise.reject("runOnFile can only run on an active editor");
    }
    outputChannel.show();
    outputChannel.clear();
    return runLint(edit.document);
}

function runOnWorkspaceFolder(): Promise<Number> {
    var edit = vscode.window.activeTextEditor;
    if (edit == undefined) {
        return Promise.reject("runOnWorkspaceFolder can only run on an active editor");
    }
    outputChannel.show();
    outputChannel.clear();
    let uri = edit.document.uri;
    let workspacefolder = vscode.workspace.getWorkspaceFolder(uri)
    let workspace = workspacefolder.uri.fsPath;
    let diagnostics = new DiagnosticAggregator(diagnosticCollection);
    return linter.run([workspace], workspace, outputChannel, diagnostics);
}

export async function activate(context: vscode.ExtensionContext) {
    outputChannel = vscode.window.createOutputChannel('ament_cpplint');
    try {
        linter = new Linter(await getConfiguration(vscode.workspace.getConfiguration('ament_cpplint')));
    } catch (ex) {
        if (ex instanceof ConfigurationError) {
            outputChannel.appendLine(ex.message);
            vscode.window.showErrorMessage(ex.message);
            return;
        } else {
            throw ex;
        }
    }

    vscode.window.onDidChangeActiveTextEditor((e) => runLint(e.document));
    vscode.workspace.onDidSaveTextDocument(runLint.bind(this));

    context.subscriptions.push(vscode.commands.registerCommand('ament_cpplint.runOnFile', runOnFile));
    context.subscriptions.push(vscode.commands.registerCommand('ament_cpplint.runOnWorkspaceFolder', runOnWorkspaceFolder));

    vscode.workspace.onDidChangeConfiguration(async (e) => {
        if (e.affectsConfiguration('ament_cpplint')) {
            try {
                linter = new Linter(await getConfiguration(vscode.workspace.getConfiguration('ament_cpplint')));
            } catch (ex) {
                if (ex instanceof ConfigurationError) {
                    vscode.window.showErrorMessage(ex.message);
                } else {
                    throw ex;
                }
            }
        }
    });
    console.log('active');
    console.log(vscode.window.activeTextEditor);
    if (vscode.window.activeTextEditor) {
        let document = vscode.window.activeTextEditor.document;
        if (isSupportedLanguage(document.languageId)) {
            return runLint(document);
        }
    }
}

export function deactivate() { }
