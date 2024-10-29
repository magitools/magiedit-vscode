// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {ofetch} from "ofetch";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "magiedit-vscode" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('magiedit-vscode.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from magiedit-vscode!');
	});
	context.subscriptions.push(disposable);

	const checkConfig = (): boolean => {
		const config = vscode.workspace.getConfiguration("magiedit-vscode");
		return config.get('url') !== undefined && config.get('api_key') !== undefined;
	};

	context.subscriptions.push(vscode.commands.registerCommand('magiedit-vscode.check', () => {
		if (!checkConfig()) {
			vscode.window.showErrorMessage("Invalid configuration detected! Please verify magiedit's extension settings");
		} else {
			vscode.window.showInformationMessage('Everything looks good!');
		}

	}));

	context.subscriptions.push(vscode.commands.registerCommand('magiedit-vscode.publish', async() => {
		const config = vscode.workspace.getConfiguration("magiedit-vscode");
		if (!checkConfig()) {
			vscode.window.showErrorMessage("Invalid configuration detected! Please verify magiedit's extension settings");
			return;
		}
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showErrorMessage("Could not find an open file; please open a markdown file before publishing");
			return;
		}
		if (editor.document.languageId !== "markdown") {
			vscode.window.showErrorMessage("Invalid file opened; please open a markdown file");
			return;
		}
		const publishers = await vscode.window.withProgress({
			title: "Fetching Publishers",
			location: vscode.ProgressLocation.Notification
		}, async(progress) => {
			const res = await ofetch<{publishers: Array<{name: string, id:number}>}>(`${config.get('url')}/api/publishers`, {
				headers: {
					'authorization': `Bearer ${config.get('api_key')}`
				}
			});
			progress.report({message: "Got publishers, parsing...", increment: 50});
			return res.publishers;
		} );

		const selection = await vscode.window.showQuickPick(publishers.map((e) => e.name), {
			title: "Select where you want to publish",
			canPickMany: true
		});
			const res = await vscode.window.withProgress({
				title: "publishing content...",
				location: vscode.ProgressLocation.Notification
			}, async() => {
				const content = editor.document.getText();
				const res = await ofetch(`${config.get('url')}/api/publishers/publish`, {
					method: "POST",
					headers: {
						'authorization': `Bearer ${config.get('api_key')}`
					},
					body: {
						content,
						publishers: publishers.filter((e) => selection?.includes(e.name)).map((e) => e.id) 
					}
				});
				console.log(res);
				return res;
			});
			vscode.window.showInformationMessage(`Published article with selected providers; here's the result\n${Object.keys(res.status).map((k) => {
				return k + ": " + res.status[k];
			})}`);
	}));
}

// This method is called when your extension is deactivated
export function deactivate() {}
