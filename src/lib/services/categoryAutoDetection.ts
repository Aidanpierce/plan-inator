// Category auto-detection service.
// Tokenizes task titles, finds common tokens (2+ occurrences), and clusters tasks by
// shared tokens. Returns suggestions for user confirmation.

export interface CategorySuggestion {
	name: string;
	taskIds: string[];
	matchedToken: string;
}

// Common English words that carry no semantic meaning for category grouping.
const STOP_WORDS = new Set([
	'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her',
	'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its',
	'let', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'did', 'from',
	'they', 'that', 'this', 'with', 'have', 'will', 'your', 'than', 'then', 'when',
	'what', 'task', 'work', 'todo', 'write', 'make', 'done', 'due', 'add',
	'fix', 'review', 'update', 'check', 'finish', 'complete', 'quiz', 'exam',
	'test', 'homework', 'assignment', 'lab', 'lecture', 'class', 'course'
]);

export interface TaskLike {
	id: string;
	title: string;
}

/**
 * Tokenizes a task title into meaningful lowercase words (3+ chars, non-stop-words).
 */
export function tokenize(title: string): string[] {
	return title
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, ' ')
		.split(/\s+/)
		.filter((t) => t.length >= 3 && !STOP_WORDS.has(t));
}

/**
 * Detects potential category groupings from a list of uncategorized tasks.
 * Returns suggestions ordered by number of matching tasks (descending).
 */
export function detectCategories(tasks: TaskLike[]): CategorySuggestion[] {
	// Build token → task IDs map (each task counted once per token)
	const tokenMap = new Map<string, string[]>();

	for (const task of tasks) {
		const tokens = new Set(tokenize(task.title));
		for (const token of tokens) {
			if (!tokenMap.has(token)) tokenMap.set(token, []);
			tokenMap.get(token)!.push(task.id);
		}
	}

	// Keep only tokens appearing in 2+ tasks
	const suggestions: CategorySuggestion[] = [];
	for (const [token, taskIds] of tokenMap) {
		if (taskIds.length >= 2) {
			suggestions.push({
				name: token.charAt(0).toUpperCase() + token.slice(1),
				taskIds,
				matchedToken: token
			});
		}
	}

	return suggestions.sort((a, b) => b.taskIds.length - a.taskIds.length);
}
