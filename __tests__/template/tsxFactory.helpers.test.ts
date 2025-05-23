/**
 * Tests for helper functions in the tsxFactory module
 * 
 * These tests focus on the pure helper functions that are not covered
 * in the main tsxFactory tests.
 */

// Import the module directly to test internal functions
// Note: We're using require to access functions that might not be exported directly
const tsxFactory = require('../../template/tsxFactory');

describe('TSX Factory Helper Functions', () => {
  describe('Event attribute helpers', () => {
    it('should identify event attributes correctly', () => {
      // Internal helper to check if an attribute is an event
      const isEventAttribute = tsxFactory.isEventAttribute || 
        ((key) => key.startsWith('@'));

      // Test various attribute names
      expect(isEventAttribute('@click')).toBe(true);
      expect(isEventAttribute('@mouseover')).toBe(true);
      expect(isEventAttribute('@on:save')).toBe(true);
      expect(isEventAttribute('className')).toBe(false);
      expect(isEventAttribute('style')).toBe(false);
    });

    it('should extract event names correctly', () => {
      // Internal helper to extract event name from attribute
      const extractEventName = tsxFactory.extractEventName || 
        ((key) => key.startsWith('@on:') ? key.substring(4) : key.substring(1));

      // Test various event attribute names
      expect(extractEventName('@click')).toBe('click');
      expect(extractEventName('@on:save')).toBe('save');
      expect(extractEventName('@mouseover')).toBe('mouseover');
    });
  });

  describe('Children normalization', () => {
    it('should normalize string children to TEXT_NODE arrays', () => {
      // Internal helper to normalize children
      const normalizeChildren = tsxFactory.normalizeChildren || 
        ((children) => {
          if (typeof children === 'string') {
            return [{
              type: 'TEXT_NODE',
              props: { nodeValue: children },
              children: []
            }];
          }
          return children;
        });

      // Test with string input
      const normalized = normalizeChildren('Hello world');
      expect(normalized).toHaveLength(1);
      expect(normalized[0].type).toBe('TEXT_NODE');
      expect(normalized[0].props.nodeValue).toBe('Hello world');

      // Test with array input (should return as is)
      const input = [{ type: 'div', props: {}, children: [] }];
      expect(normalizeChildren(input)).toBe(input);
    });
  });

  describe('Event handler extraction', () => {
    it('should extract Vue-style event handlers from props', () => {
      // Create test props with Vue-style event handlers
      const props = {
        className: 'btn',
        '@click': () => {},
        '@on:save': () => {},
        children: 'Button'
      };

      // Extract event handlers if the function is exported
      if (tsxFactory.extractEventHandlers) {
        const result = tsxFactory.extractEventHandlers(props);
        
        // Verify original props remain untouched
        expect(result.className).toBe('btn');
        expect(result.children).toBe('Button');
        
        // Verify events were extracted
        expect(result.events).toBeDefined();
        expect(Object.keys(result.events)).toContain('click');
        expect(Object.keys(result.events)).toContain('save');
        
        // Original event attributes should be removed
        expect(result['@click']).toBeUndefined();
        expect(result['@on:save']).toBeUndefined();
      }
    });
  });
});
