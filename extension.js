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

                            const messageTypeStr = message.data.messageType;
                            
                            if (!messageTypeStr) {
                                panel.webview.postMessage({
                                    message: 'No message found in protobuf',
                                    data: message.data
                                });
                                return;
                            }

                            const messageType = protoParseResult.root.lookupType(messageTypeStr);

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
                            const messageStr = Buffer.from(protoMessageBytes).toString('utf8');

                            panel.webview.postMessage({
                                message: 'Encoded successfully',
                                data: {
                                    encoded: messageStr,
                                    protobuf: message.data.protobuf,
                                    decoded: message.data.decoded,
                                    messageType: message.data.messageType
                                }
                            });
                            return;
                        case 'decode':
                            const protoParseResultDecode = protobuf.parse(message.data.protobuf);

                            if (!protoParseResultDecode) {
                                panel.webview.postMessage({
                                    message: 'No root found in protobuf',
                                    data: message.data
                                });
                                return;
                            }

                            const messageTypeStrDecode = message.data.messageType;

                            if (!messageTypeStrDecode) {
                                panel.webview.postMessage({
                                    message: 'No message found in protobuf',
                                    data: message.data
                                });
                                return;
                            }

                            const messageTypeDecode = protoParseResultDecode.root.lookupType(messageTypeStrDecode);

                            const encodedBytes = Buffer.from(message.data.encoded, 'utf8');
                            let decodedMessage;
                            try {
                                decodedMessage = messageTypeDecode.decode(encodedBytes);
                            } catch (e) {
                                panel.webview.postMessage({
                                    message: 'Invalid encoded item',
                                    data: message.data
                                });
                                return;
                            }
                            const decodedObject = messageTypeDecode.toObject(decodedMessage, {
                                enums: String,
                                longs: String,
                                bytes: String,
                                defaults: true
                            });

                            panel.webview.postMessage({
                                message: 'Decoded successfully',
                                data: {
                                    encoded: message.data.encoded,
                                    protobuf: message.data.protobuf,
                                    decoded: JSON.stringify(decodedObject, null, 2),
                                    messageType: message.data.messageType
                                }
                            });
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
