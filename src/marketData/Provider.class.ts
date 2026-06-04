// SPDX-License-Identifier: AGPL-3.0-only

import { IProvider } from './IProvider';
import { BaseProvider } from './BaseProvider';
import { MockProvider } from './Mock/MockProvider.class';

export { BaseProvider } from './BaseProvider';

type TProvider = {
    [key: string]: IProvider;
};

const isNodeEnvironment = typeof process !== 'undefined' && process.versions && process.versions.node;

let MockProviderInstance: IProvider | null = null;
if (isNodeEnvironment) {
    try {
        MockProviderInstance = new MockProvider();
    } catch (e) {
        MockProviderInstance = null;
    }
}

export const Provider: TProvider = {
    ...(MockProviderInstance ? { Mock: MockProviderInstance } : {}),
};

export function registerProvider(name: string, provider: IProvider) {
    Provider[name] = provider;
}
