# Json Sync

> It's a cool tool, but I no longer have the time to maintain it.

A Deno tool to sync JSON data from a provider to a receiver.

NOTE: Syncing is one way, meaning that the receiver cannot sync to the provider.

Here is an example of a provider:

```ts
import { makeJsonSyncProvider } from 'https://denopkg.com/Vehmloewff/json-sync@1.0.0/mod.ts'

const state = {
	foo: 'bar',
	baz: ['bob', 'elias', 'jacob'],
	// ...
}

const { sync, getState } = makeJsonSyncProvider(state, {
	sendChanges(changes) {
		// beam changes to receiver via websocket, Web Worker messages, etc.
		ws.send('c' + JSON.stringify(changes))
	}
})

// before the receiver can function properly, it must get the initial state
ws.send('initial' + JSON.stringify(getState()))

// When you need to, you can mutate the state, and diff it down to the receiver
function onNewNameAdded() {
	// Modify the state
	state.foo = 'baz'
	state.baz.push('jack')

	// Sync it to the receiver
	sync()
}
```

And here is the respective example for the receiver:

```ts
import { makeJsonSyncReceiver } from 'https://denopkg.com/Vehmloewff/json-sync@1.0.0/mod.ts'

const { setState, watchPath, getValue, applyChanges } = makeJsonSyncReceiver()

ws.on('message', ({ data }) => {
	if (data.startsWith('initial')) {
		const state = JSON.parse(data.slice(7))

		// When the initial state is received from the provider, notify the receiver of it by calling setState on it
		setState(state)
	}
	else if (data.startsWith('c')) {
		const changes = JSON.parse(data.slice(1))

		// When changes are received from the provider, call applyChanges to blend them into the existing state
		// and notify listeners
		applyChanges(changes)
	}
})


// Get the value of a particular piece of state
// NOTE: only works if `setState` has already been called
getValue('foo') // bar
getValue('baz.0') // bob

// Watch the 'baz' path for all changes to it or one of it's children
const unsubscribe = watchPath('baz', newValue => {
	newValue // ['bob', 'elias', 'jacob', 'jack']
})

ws.on('close', () => {
	// stop watching for changes to 'baz'
	unsubscribe()
})
```
