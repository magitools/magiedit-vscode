// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { ofetch } from "ofetch";


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	const checkConfig = (): boolean => {
		const config = vscode.workspace.getConfiguration("magiedit-vscode");
		return config.get('url') !== undefined && config.get('api_key') !== undefined;
	};

	const getPublishers = async() => {
		const config = vscode.workspace.getConfiguration("magiedit-vscode");
		const res = await ofetch<{publishers: Array<{name: string, id:number}>}>(`${config.get('url')}/api/publishers`, {
			headers: {
				'authorization': `Bearer ${config.get('api_key')}`
			}
		});
		return res.publishers;
	};

	const publish = async(publishers: Array<number>, content: string) => {
		const config = vscode.workspace.getConfiguration("magiedit-vscode");
		const res = await ofetch<{status: Record<string, boolean>}>(`${config.get('url')}/api/publishers/publish`, {
			method: "POST",
			headers: {
				'authorization': `Bearer ${config.get('api_key')}`,
				'content-type': 'application/json'
			},
			body: JSON.stringify({
				content,
				publishers
			})
		});
		return res.status;
	};

	context.subscriptions.push(vscode.commands.registerCommand('magiedit-vscode.check', () => {
		if (!checkConfig()) {
			vscode.window.showErrorMessage("Invalid configuration detected! Please verify magiedit's extension settings");
		} else {
			vscode.window.showInformationMessage('Everything looks good!');
		}

	}));

	context.subscriptions.push(vscode.commands.registerCommand('magiedit-vscode.publish', async() => {
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
		}, async() => {
			return await getPublishers();
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
				return await publish(publishers.filter((e) => selection?.includes(e.name)).map((e) => e.id), content);
			});
			vscode.window.showInformationMessage(`Published article with selected providers; here's the result\n${Object.keys(res).map((k) => {
				return k + ": " + res[k];
			})}`);
	}));
}

// This method is called when your extension is deactivated
export function deactivate() {}
