/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { LanguageModelToolInformation } from 'vscode';
import { equals as arraysEqual } from '../../../../util/vs/base/common/arrays';
import { CancellationToken } from '../../../../util/vs/base/common/cancellation';
import { IInstantiationService } from '../../../../util/vs/platform/instantiation/common/instantiation';
import { LanguageModelTextPart, LanguageModelToolResult } from '../../../../vscodeTypes';
import { Conversation } from '../../../prompt/common/conversation';
import { BasicToolCategorization } from './basicToolCategorization';
import { VirtualTool } from './virtualTool';
import { IToolGrouping } from './virtualToolTypes';


export class ToolGrouping implements IToolGrouping {

	private readonly _root = new VirtualTool('', '', []);
	private readonly _categorizer = this._instantiationService.createInstance(BasicToolCategorization);
	private _isOutdated = true;

	public get tools(): readonly LanguageModelToolInformation[] {
		return this._tools;
	}

	public set tools(tools: readonly LanguageModelToolInformation[]) {
		if (!arraysEqual(this._tools, tools, (a, b) => a.name === b.name)) {
			this._tools = tools;
			// Keep the root so that we can still expand any in-flight requests.
			this._isOutdated = true;
		}
	}

	constructor(
		_conversation: Conversation,
		private _tools: readonly LanguageModelToolInformation[],
		@IInstantiationService private readonly _instantiationService: IInstantiationService
	) {
		this._root.isExpanded = true;
	}

	expand(toolCallName: string): LanguageModelToolResult | undefined {
		const virtual = this._root.findVirtual(toolCallName);
		if (!virtual) {
			return;
		}

		virtual.isExpanded = true;
		return new LanguageModelToolResult([
			new LanguageModelTextPart('Tools successfully activated.'),
		]);
	}

	async compute(token: CancellationToken): Promise<readonly LanguageModelToolInformation[]> {
		if (this._isOutdated) {
			await this._categorizer.categorize(this._root, this._tools.slice(), token);
		}

		return Promise.resolve([...this._root.tools()]);
	}
}
