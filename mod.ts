// deno-lint-ignore-file no-explicit-any

import { Data, Flattened, Change } from './types.ts'
import { flatten, diff, applyChanges as bareApplyChanges, rebuild } from './utils.ts'

//
// Provider
//

export interface MakeJsonSyncProviderParams {
	sendChanges(changes: Change[]): unknown
}

export interface MakeJsonSyncProviderResult {
	sync(): void
	syncChanges(changes: Change[]): void
	getState(): Flattened
}

export function makeJsonSyncProvider(data: Data, params: MakeJsonSyncProviderParams): MakeJsonSyncProviderResult {
	const sendChanges = params.sendChanges

	let currentState = flatten(data)

	function sync() {
		const probablyChanged = flatten(data)
		const changes = diff(currentState, probablyChanged)

		if (changes.length) {
			currentState = probablyChanged
			sendChanges(changes)
		}
	}

	function syncChanges(changes: Change[]) {
		if (!changes.length) return

		bareApplyChanges(currentState, changes)
		sendChanges(changes)
	}

	function getState() {
		return currentState
	}

	return { sync, syncChanges, getState }
}

//
// Receiver
//

export type WatchPathListener = (newValue: any) => unknown

export interface MakeJsonSyncReceiverResult {
	setState(state: Flattened): void
	applyChanges(changes: Change[]): void
	watchPath(path: string, listener: WatchPathListener): () => void
	getValue(path: string): any
}

export function makeJsonSyncReceiver(): MakeJsonSyncReceiverResult {
	let currentState: Flattened | null = null

	type PathListener = (paths: string[]) => void
	const listeners: Set<PathListener> = new Set()

	function setState(state: Flattened) {
		currentState = state
	}

	function applyChanges(changes: Change[]) {
		if (!currentState) throw new Error('cannot apply changes to state before "setState" has been called')

		bareApplyChanges(currentState, changes)
		const paths = changes.map(c => c.p)

		for (const pathListener of listeners) pathListener(paths)
	}

	function watchPath(path: string, listener: WatchPathListener): () => void {
		const pathListener: PathListener = tryPaths => {
			if (!tryPaths.find(tryPath => tryPath.startsWith(path))) return

			listener(getValue(path))
		}

		listeners.add(pathListener)

		return () => listeners.delete(pathListener)
	}

	function getValue(path: string): unknown {
		if (!currentState) throw new Error('cannot get the value of a state path before "setState" has been called')

		return rebuild(path, currentState)
	}

	return { setState, applyChanges, watchPath, getValue }
}
