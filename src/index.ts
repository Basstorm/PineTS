// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2025 Alaa-eddine KADDOURI

import PineTS from './PineTS.class';
import { Context } from './Context.class';
import { Provider } from './marketData/Provider.class';
import { Indicator } from './Indicator';
import { PineRuntimeError } from './errors/PineRuntimeError';

// Provider classes for direct instantiation
export { BaseProvider } from './marketData/BaseProvider';

// Provider types
export type { IProvider, ISymbolInfo, BaseProviderConfig, ApiKeyProviderConfig } from './marketData/IProvider';
export type { Kline, PeriodType } from './marketData/types';
export { computeNextPeriodStart, localTimeToUTC, computeSessionClose, TIMEFRAME_SECONDS, TIMEFRAME_PERIOD_INFO } from './marketData/types';
export { aggregateCandles, selectSubTimeframe, getAggregationRatio } from './marketData/aggregation';

export type { IndicatorMetadata } from './PineTS.class';
export type { InputDef } from './namespaces/input/types';
export { PineTS, Context, Provider, Indicator, PineRuntimeError };
