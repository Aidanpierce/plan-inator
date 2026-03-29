import { describe, it, expect } from 'vitest';
import { tokenize, detectCategories } from './categoryAutoDetection.js';
import type { TaskLike } from './categoryAutoDetection.js';

describe('tokenize', () => {
	it('lowercases and splits on whitespace', () => {
		expect(tokenize('Read Chapter 5')).toEqual(['read', 'chapter']);
	});

	it('removes punctuation', () => {
		expect(tokenize('CS101: Physics #3')).toContain('cs101');
		expect(tokenize('CS101: Physics #3')).toContain('physics');
	});

	it('filters short tokens (< 3 chars)', () => {
		expect(tokenize('Do it now')).not.toContain('do');
		expect(tokenize('Do it now')).not.toContain('it');
	});

	it('filters stop words', () => {
		expect(tokenize('Finish the assignment for class')).not.toContain('the');
		expect(tokenize('Finish the assignment for class')).not.toContain('for');
		expect(tokenize('Finish the assignment for class')).not.toContain('finish');
	});

	it('returns empty array for title with only stop words', () => {
		expect(tokenize('fix the task')).toEqual([]);
	});

	it('deduplicates within a single title', () => {
		const tokens = tokenize('math math math');
		expect(tokens.filter((t) => t === 'math').length).toBe(3); // tokenize itself does not deduplicate
	});
});

describe('detectCategories', () => {
	it('returns empty for fewer than 2 tasks', () => {
		const tasks: TaskLike[] = [{ id: '1', title: 'CS101 homework' }];
		expect(detectCategories(tasks)).toEqual([]);
	});

	it('returns empty when no token appears in 2+ tasks', () => {
		const tasks: TaskLike[] = [
			{ id: '1', title: 'biology essay' },
			{ id: '2', title: 'physics lab' }
		];
		expect(detectCategories(tasks)).toEqual([]);
	});

	it('detects a shared token across two tasks', () => {
		const tasks: TaskLike[] = [
			{ id: '1', title: 'CS101 homework' },
			{ id: '2', title: 'CS101 quiz' }
		];
		const suggestions = detectCategories(tasks);
		expect(suggestions.length).toBeGreaterThan(0);
		const cs101 = suggestions.find((s) => s.matchedToken === 'cs101');
		expect(cs101).toBeDefined();
		expect(cs101!.taskIds).toContain('1');
		expect(cs101!.taskIds).toContain('2');
	});

	it('capitalizes the suggestion name', () => {
		const tasks: TaskLike[] = [
			{ id: '1', title: 'math homework' },
			{ id: '2', title: 'math quiz' }
		];
		const suggestions = detectCategories(tasks);
		const math = suggestions.find((s) => s.matchedToken === 'math');
		expect(math?.name).toBe('Math');
	});

	it('sorts by number of matching tasks descending', () => {
		const tasks: TaskLike[] = [
			{ id: '1', title: 'physics lab' },
			{ id: '2', title: 'physics homework' },
			{ id: '3', title: 'physics quiz' },
			{ id: '4', title: 'math quiz' },
			{ id: '5', title: 'math exam' }
		];
		const suggestions = detectCategories(tasks);
		expect(suggestions[0].matchedToken).toBe('physics'); // 3 tasks
		expect(suggestions[1].matchedToken).toBe('math'); // 2 tasks (quiz is a stop word)
	});

	it('counts each task once per token even if token appears multiple times in title', () => {
		const tasks: TaskLike[] = [
			{ id: '1', title: 'physics physics lab' },
			{ id: '2', title: 'physics homework' }
		];
		const suggestions = detectCategories(tasks);
		const physics = suggestions.find((s) => s.matchedToken === 'physics');
		expect(physics!.taskIds.length).toBe(2);
	});

	it('handles tasks with no meaningful tokens gracefully', () => {
		const tasks: TaskLike[] = [
			{ id: '1', title: 'fix the task' },
			{ id: '2', title: 'fix the task' }
		];
		expect(detectCategories(tasks)).toEqual([]);
	});
});
