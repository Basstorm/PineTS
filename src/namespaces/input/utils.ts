import { parseArgsForPineParams } from '../utils';
import { InputOptions } from './types';
const INPUT_SIGNATURES = [
    ['defval', 'title', 'tooltip', 'inline', 'group', 'display'],
    ['defval', 'title', 'tooltip', 'group', 'confirm', 'display'],
    ['defval', 'title', 'tooltip', 'inline', 'group', 'confirm', 'display'],
    ['defval', 'title', 'options', 'tooltip', 'inline', 'group', 'confirm', 'display'],
    ['defval', 'title', 'minval', 'maxval', 'step', 'tooltip', 'inline', 'group', 'confirm', 'display'],
];

const INPUT_ARGS_TYPES = {
    defval: 'primitive',
    title: 'string',
    tooltip: 'string',
    inline: 'string',
    group: 'string',
    display: 'string',
    confirm: 'boolean',
    options: 'array',
    minval: 'number',
    maxval: 'number',
    step: 'number',
};

export function parseInputOptions(args: any[]): Partial<InputOptions> {
    // Pop the transpiler-injected `{ __varId }` sentinel if present (always the
    // last arg — added after param-wrapping, so it's a raw object literal). A
    // Series or a real options object won't carry an own `__varId` property.
    let varId: string | undefined;
    const last = args[args.length - 1];
    if (last && typeof last === 'object' && Object.prototype.hasOwnProperty.call(last, '__varId')) {
        varId = (last as any).__varId;
        args = args.slice(0, -1);
    }
    const options = parseArgsForPineParams<Partial<InputOptions>>(args, INPUT_SIGNATURES, INPUT_ARGS_TYPES);
    if (varId !== undefined) options.__varId = varId;

    // Fix: `options` array gets mangled by $.param() wrapping — it treats
    // ["SMA","EMA",...] as time-series data and $.get() returns a single element.
    // Recover the original array from the named-args object in the raw args.
    if (options.options !== undefined && !Array.isArray(options.options)) {
        // Find the named-args bag (last plain object arg)
        for (let i = args.length - 1; i >= 0; i--) {
            const a = args[i];
            if (a && typeof a === 'object' && !Array.isArray(a) && a.options !== undefined) {
                // a.options may be a Series wrapping the original array
                const raw = a.options;
                if (raw && typeof raw === 'object' && 'data' in raw && Array.isArray(raw.data)) {
                    // Series: data is the original array (treated as time-series)
                    options.options = raw.data;
                } else if (Array.isArray(raw)) {
                    options.options = raw;
                }
                break;
            }
        }
    }
    return options;
}

/** Unwrap a PineTS Series {data:[...], offset} to its scalar (last element). */
function unwrapScalar(v: any): any {
    if (v && typeof v === 'object' && Array.isArray(v.data)) {
        const d = v.data;
        return d.length > 0 ? d[d.length - 1] : null;
    }
    return v;
}

/** Unwrap options array — handles Series-wrapped arrays and plain arrays. */
function unwrapOptions(v: any): any[] | undefined {
    if (v == null) return undefined;
    // Series wrapping an array: {data: [[...], [...], ...]} — take last bar's value
    if (v && typeof v === 'object' && !Array.isArray(v) && Array.isArray(v.data)) {
        const d = v.data;
        const last = d.length > 0 ? d[d.length - 1] : null;
        if (Array.isArray(last)) return last.map(unwrapScalar);
        // data is flat scalars — use entire data array
        return d.map(unwrapScalar);
    }
    if (Array.isArray(v)) return v.map(unwrapScalar);
    return undefined;
}

export function resolveInput(context: any, options: Partial<InputOptions>, callerType: string = 'any') {
    // Register input definition (first call per title only) [QF]
    if (context.inputRegistry) {
        const regKey = options.__varId || options.title || `__anon_${context.inputRegistry.length}`;
        if (!context._inputTitlesSeen.has(regKey)) {
            context._inputTitlesSeen.add(regKey);
            // Unwrap Series values for metadata — options needs special handling
            // since it's an array that may be Series-wrapped by $.param().
            const opts = unwrapOptions(options.options);
            context.inputRegistry.push({
                type: callerType,
                title: unwrapScalar(options.title) ?? regKey,
                varId: options.__varId,
                defval: unwrapScalar(options.defval),
                ...(options.minval !== undefined && { minval: unwrapScalar(options.minval) }),
                ...(options.maxval !== undefined && { maxval: unwrapScalar(options.maxval) }),
                ...(options.step !== undefined && { step: unwrapScalar(options.step) }),
                ...(opts !== undefined && { options: opts }),
                ...(options.group !== undefined && { group: unwrapScalar(options.group) }),
                ...(options.tooltip !== undefined && { tooltip: unwrapScalar(options.tooltip) }),
                ...(options.inline !== undefined && { inline: unwrapScalar(options.inline) }),
            });
        }
    }

    // Override resolution, PRIMARY → fallback:
    //   1. by varId   — the variable name; robust to empty/duplicate titles
    //   2. by title   — back-compat (legacy constructor `inputs` map)
    //   3. source default
    let resolved: any = undefined;
    if (options.__varId && context.inputs && context.inputs[options.__varId] !== undefined) {
        resolved = context.inputs[options.__varId];
    } else if (options.title && context.inputs && context.inputs[options.title] !== undefined) {
        resolved = context.inputs[options.title];
    } else {
        return options.defval;
    }

    // For source-type inputs, a string override like "ohlc4" must be resolved
    // to the actual price series from context.data. [QF]
    if (callerType === 'source' && typeof resolved === 'string' && context.data) {
        const SOURCES: Record<string, (d: any) => any> = {
            close: (d) => d.close,
            open: (d) => d.open,
            high: (d) => d.high,
            low: (d) => d.low,
            hl2: (d) => d.hl2,
            hlc3: (d) => d.hlc3,
            ohlc4: (d) => d.ohlc4,
            hlcc4: (d) => d.hlcc4,
        };
        const getter = SOURCES[resolved.toLowerCase()];
        if (getter) return getter(context.data);
    }
    return resolved;
}
