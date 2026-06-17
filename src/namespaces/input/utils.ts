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
    return options;
}

export function resolveInput(context: any, options: Partial<InputOptions>, callerType: string = 'any') {
    // Register input definition (first call per title only) [QF]
    if (context.inputRegistry) {
        const regKey = options.__varId || options.title || `__anon_${context.inputRegistry.length}`;
        if (!context._inputTitlesSeen.has(regKey)) {
            context._inputTitlesSeen.add(regKey);
            context.inputRegistry.push({
                type: callerType,
                title: options.title ?? regKey,
                varId: options.__varId,
                defval: options.defval,
                ...(options.minval !== undefined && { minval: options.minval }),
                ...(options.maxval !== undefined && { maxval: options.maxval }),
                ...(options.step !== undefined && { step: options.step }),
                ...(options.options !== undefined && { options: options.options }),
                ...(options.group !== undefined && { group: options.group }),
                ...(options.tooltip !== undefined && { tooltip: options.tooltip }),
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
