/**
 * Logic for the "Anchored" RSVP display.
 * 
 * Standard RSVP uses an Optimal Recognition Point (ORP).
 * This specific request asks for a "Sticky Anchor":
 * If the previous word was anchored on 'a', try to find 'a' in the next word 
 * and anchor on that.
 */

export class AnchorEngine {
    constructor() {
        this.lastAnchorChar = null;
    }

    /**
     * Resets the engine state (e.g. when starting a new sentence or text).
     */
    reset() {
        this.lastAnchorChar = null;
    }

    /**
     * Determines the pivot index for a word.
     * @param {string} word - The word to process.
     * @returns {object} - { pivotIndex: number, anchorChar: string }
     */
    process(word) {
        if (!word) return { pivotIndex: 0, anchorChar: '' };

        const len = word.length;
        let pivotIndex = -1;

        // Strategy 1: Sticky Anchor
        // If we have a previous anchor char, try to find it in this word.
        if (this.lastAnchorChar) {
            // Find all instances
            const matches = [];
            for (let i = 0; i < len; i++) {
                if (word[i].toLowerCase() === this.lastAnchorChar.toLowerCase()) {
                    matches.push(i);
                }
            }

            if (matches.length > 0) {
                // If multiple matches, pick the one closest to the "standard" center
                // to avoid the word jumping too wildly to the side.
                const idealCenter = Math.floor(len / 2);
                pivotIndex = matches.reduce((prev, curr) => {
                    return (Math.abs(curr - idealCenter) < Math.abs(prev - idealCenter) ? curr : prev);
                });
            }
        }

        // Strategy 2: Standard ORP (Fallback)
        // If sticky failed or didn't exist, calculate standard ORP.
        if (pivotIndex === -1) {
            // Standard ORP is usually slightly to the left of center.
            // unique algorithm: length 1=>0, 2=>0, 3=>1, 4=>1, 5=>1, 6=>2, ...
            // let's use a simple heuristic: 35% point or center.
            if (len <= 1) pivotIndex = 0;
            else if (len >= 2 && len <= 5) pivotIndex = 1;
            else if (len >= 6 && len <= 9) pivotIndex = 2;
            else if (len >= 10 && len <= 13) pivotIndex = 3;
            else pivotIndex = 4;
            
            // Re-adjust for very long words to be more dynamic if needed, 
            // but fixed offset often works better for stability.
            // Let's stick to a robust simple center-ish for fallback.
            pivotIndex = Math.ceil(len / 2) - 1; 
            if (pivotIndex < 0) pivotIndex = 0;
        }

        this.lastAnchorChar = word[pivotIndex];
        
        return {
            pivotIndex,
            anchorChar: this.lastAnchorChar
        };
    }
}
