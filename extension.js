// The module 'vscode' contains the VS Code extensibility API


const path = require('path');
const fs = require('fs');
const protobuf = require("protobufjs");

// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	context.subscriptions.push(
		vscode.commands.registerCommand('protobuf-codec.openWebview', () => {
			const panel = vscode.window.createWebviewPanel(
                'protobuf-codec',
                'Protobuf Codec',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                }
            );

            panel.webview.html = getWebviewContent(context);

            panel.webview.onDidReceiveMessage(
                message => {
                    switch (message.command) {
                        case 'encode':
                            const protoParseResult = protobuf.parse(message.data.protobuf);

                            if (!protoParseResult) {
                                panel.webview.postMessage({
                                    message: 'No root found in protobuf',
                                    data: message.data
                                });
                                return;
                            }

                            const firstMessage = message.data.protobuf.match(/message\s+(\w+)/)?.[1];
                            
                            if (!firstMessage) {
                                panel.webview.postMessage({
                                    message: 'No message found in protobuf',
                                    data: message.data
                                });
                                return;
                            }

                            const messageType = protoParseResult.root.lookupType(firstMessage);

                            const decoded = JSON.parse(message.data.decoded)

                            const errMsg = messageType.verify(decoded);
                            if (errMsg) {
                                panel.webview.postMessage({
                                    message: 'Invalid encoded item',
                                    data: errMsg
                                });
                                return;
                            }
                          
                            const protoMessage = messageType.create(decoded);
                            const protoMessageBytes = messageType.encode(protoMessage).finish();

                            const messageStr = Buffer.from(new Uint8Array(protoMessageBytes))
                                .toString('base64')

                            panel.webview.postMessage({
                                message: 'Encoded successfully',
                                data: {
                                    encoded: messageStr,
                                    protobuf: message.data.protobuf,
                                    decoded: message.data.decoded
                                }
                            });
                            return;
                        case 'decode':
                            panel.webview.postMessage(`Decoding: ${messageStr}`);
                            return;
                    }
                },
                undefined,
                context.subscriptions
            );
		})
	)
}

// This method is called when your extension is deactivated
function deactivate() {}

function getWebviewContent(context) {
    const filePath = path.join(context.extensionPath, 'media', 'webview.html');
    return fs.readFileSync(filePath, 'utf8');
}

module.exports = {
	activate,
	deactivate
}
