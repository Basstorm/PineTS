import { describe, it, expect } from 'vitest';
import { PineTS } from 'index';

const SAMPLE_DATA = Array.from({ length: 50 }, (_, i) => ({
    open: 100 + i, high: 102 + i, low: 99 + i, close: 101 + i,
    volume: 1000000, openTime: 1704067200000 + i * 86400000,
}));

describe('getMetadata', () => {
    it('returns indicator metadata with overlay and inputs', async () => {
        const pine = new PineTS(SAMPLE_DATA, 'AAPL', 'D');
        await pine.run(`
//@version=5
indicator("Test Indicator", overlay=true)
len = input.int(20, "Length", minval=1, maxval=500)
src = input.source(close, "Source")
plot(ta.sma(src, len), "SMA")
`);
        const meta = pine.getMetadata();
        expect(meta).not.toBeNull();
        expect(meta!.overlay).toBe(true);
        expect(meta!.title).toBe('Test Indicator');
        expect(meta!.inputs.length).toBe(2);

        const lenInput = meta!.inputs.find(i => i.title === 'Length');
        expect(lenInput).toBeDefined();
        expect(lenInput!.type).toBe('int');
        expect(lenInput!.defval).toBe(20);
        expect(lenInput!.minval).toBe(1);
        expect(lenInput!.maxval).toBe(500);

        const srcInput = meta!.inputs.find(i => i.title === 'Source');
        expect(srcInput).toBeDefined();
        expect(srcInput!.type).toBe('source');
    });

    it('returns overlay=false for non-overlay indicators', async () => {
        const pine = new PineTS(SAMPLE_DATA, 'AAPL', 'D');
        await pine.run(`
//@version=5
indicator("RSI", overlay=false)
plot(ta.rsi(close, 14), "RSI")
`);
        const meta = pine.getMetadata();
        expect(meta!.overlay).toBe(false);
        expect(meta!.title).toBe('RSI');
    });

    it('auto-generates syminfo from tickerId', async () => {
        const pine = new PineTS(SAMPLE_DATA, 'MSFT', 'D');
        const ctx = await pine.run(`
//@version=5
indicator("Sym Test", overlay=true)
plot(close, syminfo.tickerid)
`);
        expect(ctx.plots).toBeDefined();
    });
});
