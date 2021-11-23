import { Data, Flattened, Change } from './types.ts'

export function flatten(data: Data): Flattened {
	const flattened: Flattened = {}

	const join = (root: string, child: string) => {
		if (!root.length) return child

		return `${root}.${child}`
	}

	const dig = (key: string, data: unknown) => {
		if (data === undefined) return

		if (data === null) flattened[key] = null
		else if (typeof data === 'string' || typeof data === 'boolean' || typeof data === 'number') flattened[key] = data
		else if (Array.isArray(data) || typeof data === 'object') {
			for (const childKey in data) dig(join(key, childKey), data[childKey as keyof typeof data])
		} else throw new Error(`unsupported type at "${key}": ${typeof data}`)
	}

	dig('', data)

	return flattened
}

export function diff(base: Flattened, updated: Flattened): Change[] {
	const changes: Change[] = []

	// Check if anything was set
	for (const key in updated) {
		const updatedValue = updated[key]
		const baseValue = base[key]

		if (baseValue !== updatedValue) changes.push({ $: 'S', p: key, v: updatedValue })
	}

	// Check if anything was deleted
	for (const key in base) {
		if (updated[key] === undefined) changes.push({ $: 'D', p: key })
	}

	return changes
}

export function rebuild(key: string, flattened: Flattened): unknown {
	// If the value directly exists, return it
	if (flattened[key] !== undefined) return flattened[key]

	// Otherwise, it is an object or array.  List all the direct children
	const childKeys = Object.keys(flattened)
		.filter(exampleKey => exampleKey.startsWith(key))
		.map(childKey => childKey.slice(key.length + 1).split('.')[0])

	// If there are no keys, it could be that the root key entered was invalid,
	// or that this is an empty object, or an empty array
	// If the user entered an invalid key, we will leave him with the trouble of getting an unexpected type
	// We will return an empty array, because an empty array maps very similar to an object
	if (!childKeys.length) return []

	// Ok, *sigh of relief*.  There are some child keys to work with
	// We'll go ahead and parse each child key into a number
	const numericalChildKeys = childKeys.map(childKey => parseInt(childKey))
	const numericalContainsNaN = numericalChildKeys.find(childKey => isNaN(childKey))
	if (numericalContainsNaN !== undefined) {
		// at least one of the keys could not be parsed into a number,
		// so we will assume this was meant to be an object
		{
			const obj: Record<string, unknown> = {}

			for (const childKey of childKeys) obj[childKey] = rebuild(`${key}.${childKey}`, flattened)

			return obj
		}
	}

	// All child keys are numerical, so this is an array
	return numericalChildKeys.map(childKey => rebuild(`${key}.${childKey}`, flattened))
}

export function applyChanges(flattened: Flattened, changes: Change[]) {
	for (const change of changes) {
		if (change.$ === 'D') delete flattened[change.p]
		else if (change.$ === 'S') flattened[change.p] = change.v
	}
}
