import { join } from 'path';
import { workspace, ExtensionContext, languages, Disposable } from 'vscode';

import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    TransportKind
} from 'vscode-languageclient';
import OMTLinkProvider from './omtLinkProvider';

let client: LanguageClient;

export function activate(context: ExtensionContext) {
    // The server is implemented in node
    const serverModule = context.asAbsolutePath(
        join('server', 'out', 'server.js')
    );
    // The debug options for the server
    // --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging
    const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

    // If the extension is launched in debug mode then the debug server options are used
    // Otherwise the run options are used
    const serverOptions: ServerOptions = {
        run: { module: serverModule, transport: TransportKind.ipc },
        debug: {
            module: serverModule,
            transport: TransportKind.ipc,
            options: debugOptions
        },
    };

    // Options to control the language client
    const clientOptions: LanguageClientOptions = {
        // Register the server for OMT and ODT documents
        documentSelector: [
            { scheme: 'file', language: 'omt' },
            { scheme: 'file', language: 'odt' },
        ],
        synchronize: {
            // Notify the server about changes to files conforming to these patterns:
            fileEvents: [
                workspace.createFileSystemWatcher('**/*.omt'),
                workspace.createFileSystemWatcher('**/package.json'),
            ],
        },
    };

    // Create the language client and start the client.
    client = new LanguageClient(
        'languageServerExample',
        'Language Server Example',
        serverOptions,
        clientOptions
    );

    // Start the client. This will also launch the server
    client.start();

    // register document link provider for OMT files
    Disposable.from(
        languages.registerDocumentLinkProvider(
            { scheme: 'file', language: 'omt' }, new OMTLinkProvider(client))
    );
}

export function deactivate(): Thenable<void> | undefined {
    if (!client) {
        return undefined;
    }
    return client.stop();
}
