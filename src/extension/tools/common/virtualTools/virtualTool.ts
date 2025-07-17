/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { LanguageModelToolInformation } from 'vscode';

export const VIRTUAL_TOOL_NAME_PREFIX = 'activate_';

export class VirtualTool<TGroupMetadata = any> {
	public isExpanded = false;
	public contents: (LanguageModelToolInformation | VirtualTool<TGroupMetadata>)[] = [];

	constructor(
		public readonly name: string,
		private readonly description: string,
		public readonly groupMetadata: TGroupMetadata,
	) {
		if (!name.startsWith(VIRTUAL_TOOL_NAME_PREFIX)) {
			throw new Error(`Virtual tool name must start with '${VIRTUAL_TOOL_NAME_PREFIX}'`);
		}
	}

	/** Gets the virtual tool of the given name if it exists. */
	public findVirtual(name: string): VirtualTool<TGroupMetadata> | undefined {
		if (this.name === name) {
			return this;
		}

		for (const content of this.contents) {
			if (content instanceof VirtualTool) {
				const found = content.findVirtual(name);
				if (found) {
					return found;
				}
			}
		}

		return undefined;
	}

	public *all(): Iterable<LanguageModelToolInformation | VirtualTool<TGroupMetadata>> {
		yield this;
		for (const content of this.contents) {
			if (content instanceof VirtualTool) {
				yield* content.all();
			} else {
				yield content;
			}
		}
	}

	public *tools(): Iterable<LanguageModelToolInformation> {
		if (!this.isExpanded) {
			return {
				name: this.name,
				description: this.description,
				inputSchema: undefined,
				tags: [],
			};
		}

		for (const content of this.contents) {
			if (content instanceof VirtualTool) {
				yield* content.tools();
			} else {
				yield content;
			}
		}
	}
}
