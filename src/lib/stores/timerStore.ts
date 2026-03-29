import { writable } from 'svelte/store';
import { TimeEntryRepository } from '../db/repositories/TimeEntryRepository.js';
import type { TimeEntry } from '../db/types.js';

interface TimerState {
	activeEntry: TimeEntry | null;
	activeTaskId: string | null;
	elapsed: number; // seconds since timer started
}

function createTimerStore() {
	let _state: TimerState = { activeEntry: null, activeTaskId: null, elapsed: 0 };
	const { subscribe, set } = writable<TimerState>(_state);
	let interval: ReturnType<typeof setInterval> | null = null;

	function startTick(startedAt: string) {
		if (interval) clearInterval(interval);
		interval = setInterval(() => {
			const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
			_state = { ..._state, elapsed };
			set(_state);
		}, 1000);
	}

	function stopTick() {
		if (interval) {
			clearInterval(interval);
			interval = null;
		}
	}

	return {
		subscribe,

		/** Call on app boot to resume any timer that was left running. */
		async load() {
			const active = await TimeEntryRepository.getActive();
			if (active) {
				const elapsed = Math.floor(
					(Date.now() - new Date(active.startedAt).getTime()) / 1000
				);
				_state = { activeEntry: active, activeTaskId: active.taskId, elapsed };
				set(_state);
				startTick(active.startedAt);
			}
		},

		/** Start timing a task. Stops any currently running timer first. */
		async startTimer(taskId: string) {
			if (_state.activeEntry) {
				await TimeEntryRepository.stop(_state.activeEntry.id);
				stopTick();
			}
			await TimeEntryRepository.start(taskId);
			const entry = await TimeEntryRepository.getActive();
			if (entry) {
				_state = { activeEntry: entry, activeTaskId: taskId, elapsed: 0 };
				set(_state);
				startTick(entry.startedAt);
			}
		},

		/** Stop the running timer and return the completed entry id (or null). */
		async stopTimer(): Promise<string | null> {
			if (!_state.activeEntry) return null;
			const entryId = _state.activeEntry.id;
			await TimeEntryRepository.stop(entryId);
			stopTick();
			_state = { activeEntry: null, activeTaskId: null, elapsed: 0 };
			set(_state);
			return entryId;
		},

		/** Call when unmounting the app to clear the interval. */
		cleanup() {
			stopTick();
		}
	};
}

export const timerStore = createTimerStore();
