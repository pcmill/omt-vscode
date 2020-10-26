import { fail } from 'assert';
import { expect } from 'chai';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { assert, stub } from 'sinon';
import { DocumentLink, Position, Range, RemoteWorkspace } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import OMTLinkProvider from '../omtLinkProvider';
import { WorkspaceLookup } from '../workspaceLookup';

type Case = { i: number, line: number, start: number, end: number, target: string | undefined, should: string };

describe('OMTLinkProvider', () => {
    let linkProvider: OMTLinkProvider;

    before(() => {
        const stubbedWorkspace = <RemoteWorkspace><any>{
            getWorkspaceFolders: () => { },
            onDidChangeWorkspaceFolders: () => { },
            applyEdit: () => { },
            connection: {
                onDidChangeWatchedFiles: () => { }
            }
        };
        // adding file:// at the start because the vscode librart does that when it creates the WorkspaceFolders
        const workspaceFolderStub = stub(stubbedWorkspace, 'getWorkspaceFolders').returns(Promise.resolve([
            { uri: 'file://' + resolve('./testFixture/one/'), name: 'one' },
            { uri: 'file://' + resolve('./testFixture/two/'), name: 'two' }]));

        //TODO: decouple the unittest for OMTLinkProvider from testing WorkspaceLookup
        const lookup = new WorkspaceLookup(stubbedWorkspace as {} as RemoteWorkspace);

        assert.calledOnce(workspaceFolderStub);

        linkProvider = new OMTLinkProvider(lookup);
    });

    describe('provideDocumentLinks', () => {
        let actualDocumentLinks: DocumentLink[];

        before((done) => {
            const uri = 'testFixture/one/imports.omt';
            const textDocument = TextDocument.create(uri, 'omt', 1, readFileSync(resolve(uri)).toString());

            linkProvider.provideDocumentLinks(textDocument).then((links) => {
                actualDocumentLinks = links;
                done();
            }).catch((error) => {
                fail(error);
            });
        })

        // test uri links with and without shorthands
        const cases: Case[] = [
            { i: 0, line: 1, start: 1, end: 18, target: undefined, should: 'should make a link for a declared import' },
            { i: 1, line: 3, start: 5, end: 20, target: resolve('testFixture/relative.omt'), should: 'should make a link for a relative path' },
            { i: 2, line: 5, start: 4, end: 24, target: resolve('testFixture/one/shorthanded.omt'), should: 'should recognize a shorthand from the tsconfig in current project folder' },
            { i: 3, line: 7, start: 5, end: 29, target: resolve('testFixture/one/quotedShorthand.omt'), should: 'should ignore quotes 1' },
            { i: 4, line: 9, start: 5, end: 35, target: resolve('testFixture/one/doubleQuotedShorthand.omt'), should: 'should ignore quotes 2' },
            { i: 5, line: 11, start: 4, end: 31, target: resolve('testFixture/one/@two/siblingShorthanded.omt'), should: 'should not ignore a shorthand from a sibling path' },
            { i: 6, line: 13, start: 4, end: 27, target: resolve('testFixture/three/parentPathed.omt'), should: 'should recognize a shorthand from the tsconfig in a parent project' },
        ];

        // test all cases
        cases.forEach((value: Case) => {
            it(value.should, () => {
                testLinkProvider(
                    value.i, {
                    range: toRange(value.line, value.start, value.line, value.end),
                    target: value.target,
                });
            })
        });

        function testLinkProvider(index: number, expectedDocumentLink: DocumentLink) {
            const actualDocumentLink = actualDocumentLinks[index];
            // console.log(actualDocumentLink);
            if (expectedDocumentLink.target) {
                expect(actualDocumentLink.target).to.equal(expectedDocumentLink.target, 'target path');
                expect(actualDocumentLink.range).to.deep.equal(expectedDocumentLink.range, 'range');
            } else {
                expect(actualDocumentLink.target).to.equal(undefined, 'target');
            }
        }
    });

    describe('resolve', () => {
        it('should resolve declared imports');
    });
});

function toRange(sLine: number, sChar: number, eLine: number, eChar: number) {
    const start = Position.create(sLine, sChar);
    const end = Position.create(eLine, eChar);
    return Range.create(start, end);
}
