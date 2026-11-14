
import { describe, it, expect } from 'vitest';
import { isGlyphDrawn, getGlyphExportNameByUnicode, isSingleCopyTemplate } from './glyphUtils';
import { GlyphData } from '../types';

describe('glyphUtils', () => {
    describe('isGlyphDrawn', () => {
        it('returns false for undefined data', () => {
            expect(isGlyphDrawn(undefined)).toBe(false);
        });

        it('returns false for empty paths array', () => {
            const data: GlyphData = { paths: [] };
            expect(isGlyphDrawn(data)).toBe(false);
        });

        it('returns false if paths exist but have no points or segments', () => {
            const data: GlyphData = { 
                paths: [
                    { id: '1', type: 'pen', points: [] },
                    { id: '2', type: 'outline', points: [], segmentGroups: [] }
                ] 
            };
            expect(isGlyphDrawn(data)).toBe(false);
        });

        it('returns true if at least one path has points', () => {
            const data: GlyphData = { 
                paths: [
                    { id: '1', type: 'pen', points: [{ x: 0, y: 0 }] }
                ] 
            };
            expect(isGlyphDrawn(data)).toBe(true);
        });

        it('returns true if at least one outline path has segment groups', () => {
            const data: GlyphData = { 
                paths: [
                    { id: '1', type: 'outline', points: [], segmentGroups: [[{ point: {x:0,y:0}, handleIn:{x:0,y:0}, handleOut:{x:0,y:0} }]] }
                ] 
            };
            expect(isGlyphDrawn(data)).toBe(true);
        });
    });

    describe('getGlyphExportNameByUnicode', () => {
        it('returns "space" for unicode 32', () => {
            expect(getGlyphExportNameByUnicode(32)).toBe('space');
        });

        it('returns uniXXXX format for BMP characters', () => {
            expect(getGlyphExportNameByUnicode(65)).toBe('uni0041'); // A
            expect(getGlyphExportNameByUnicode(2949)).toBe('uni0B85'); // Tamil A
        });

        it('returns uXXXXX format for SMP characters', () => {
            expect(getGlyphExportNameByUnicode(0x1F600)).toBe('u1F600'); // Grinning Face
        });
    });
});

describe('isSingleCopyTemplate', () => {
    it('is true for a plain copy of one letter (ஆ from அ)', () => {
        expect(isSingleCopyTemplate({ composite: ['அ'] })).toBe(true);
    });
    it('is false for a resized or moved copy (Kannada ್ಖ: a smaller ಖ below the line)', () => {
        expect(isSingleCopyTemplate({ composite: ['ಖ'], compositeTransform: [{ scale: 0.6, y: 200 }] })).toBe(false);
    });
    it('ignores a transform that changes nothing', () => {
        expect(isSingleCopyTemplate({ composite: ['அ'], compositeTransform: [{ scale: 1, x: 0, y: 0, mode: 'relative' }] })).toBe(true);
    });
    it('is false for letters built from two parts', () => {
        expect(isSingleCopyTemplate({ composite: ['ெ', 'ா'] })).toBe(false);
    });
});
