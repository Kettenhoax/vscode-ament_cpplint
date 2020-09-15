import * as vscode from 'vscode';

interface LintResult {
    fileName: string;
    lineNumber: number;
    message: string;
}

export function parseResult(line: string) : LintResult {
    const regex = /^(.*):([0-9]+):\s*(.*\s+\[.*\])\s+\[([0-9]+)\]$/;
    let regexArray = regex.exec(line);
    if (!regexArray) {
        return null;
    }
    let fileName = regexArray[1];
    if (!fileName) {
        return null;
    }
    let lineNumber = Number(regexArray[2]);
    if (isNaN(lineNumber)) {
        return null;
    }
    let message = regexArray[3];
    if (!message) {
        return null;
    }
    return {
        fileName,
        lineNumber,
        message,
    };
}

export class DiagnosticAggregator {

    diagnosticCollection: vscode.DiagnosticCollection

    fileResults: { [key: string]: LintResult[] } = {};
    prevFile: string = null;

    constructor(diagnosticCollection) {
        this.diagnosticCollection = diagnosticCollection;
    }

    addLine(line) {
        let result = parseResult(line);
        if (result) {
            if (!this.fileResults[result.fileName]) {
                this.fileResults[result.fileName] = [result]
            } else {
                this.fileResults[result.fileName].push(result);
            }
            if (this.prevFile && this.prevFile !== result.fileName) {
                this.setDiagnostics(result.fileName);
            }
            this.prevFile = result.fileName;
        }
    }

    setDiagnostics(fileName) {
        return vscode.workspace.openTextDocument(fileName).then((doc: vscode.TextDocument) => {
            let diagnostics: vscode.Diagnostic[] = [];
            for (let result of this.fileResults[fileName]) {
                let line = result.lineNumber;
                if (line > 0) {
                    line--;
                }
                let l = doc.lineAt(line);
                let r = new vscode.Range(line, 0, line, l.text.length);
                let d = new vscode.Diagnostic(r, `${result.message}`, vscode.DiagnosticSeverity.Warning);
                d.source = 'ament_cpplint';
                diagnostics.push(d);
            }
            this.diagnosticCollection.set(doc.uri, diagnostics);
        });
    }

    flush() {
        return Promise.all(Object.keys(this.fileResults).map((fileName) => this.setDiagnostics(fileName)));
    }

    clear() {
        this.fileResults = {};
        this.diagnosticCollection.clear();
    }
}