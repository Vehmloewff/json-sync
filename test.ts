import { assertEquals, assert } from 'https://deno.land/std@0.113.0/testing/asserts.ts'

import { makeJsonSyncProvider } from './provider.ts'
import { makeJsonSyncReceiver } from './receiver.ts'

Deno.test({
	name: 'values should be synced',
	fn() {
		const state = { foo: 'bar', baz: { bob: true, jack: false, sampson: 10, jason: 'Hello, World!' } }

		const receiver = makeJsonSyncReceiver()
		const provider = makeJsonSyncProvider(state, {
			sendChanges(changes) {
				receiver.applyChanges(changes)
			},
		})

		receiver.setState(provider.getState())

		assertEquals(receiver.getValue('foo'), 'bar')
		assertEquals(receiver.getValue('baz').bob, true)

		let calledListener = false
		receiver.watchPath('baz.jason', newValue => {
			calledListener = true
			assertEquals(newValue, 'Hi')
		})

		state.baz.jason = 'Hi'
		provider.sync()

		assert(calledListener)
	},
})

Deno.test({
	name: 'should allow more than one path listener',
	fn() {
		const state = { foo: 'bar', baz: { bob: true, jack: false, sampson: 10, jason: 'Hello, World!' } }

		const receiver = makeJsonSyncReceiver()
		const provider = makeJsonSyncProvider(state, {
			sendChanges(changes) {
				receiver.applyChanges(changes)
			},
		})

		receiver.setState(provider.getState())

		let fooCalled = false
		receiver.watchPath('foo', () => (fooCalled = true))

		let jackCalled = false
		receiver.watchPath('baz.jack', () => (jackCalled = true))

		state.foo = 'foo'
		provider.sync()
		assert(fooCalled)

		state.baz.jack = true
		provider.sync()
		assert(jackCalled)
	},
})

Deno.test({
	name: 'listeners should be unsubscribe-able',
	fn() {
		const state = { foo: 'bar', baz: { bob: true, jack: false, sampson: 10, jason: 'Hello, World!' } }

		const receiver = makeJsonSyncReceiver()
		const provider = makeJsonSyncProvider(state, {
			sendChanges(changes) {
				receiver.applyChanges(changes)
			},
		})

		receiver.setState(provider.getState())

		let calledAmount = 0
		const unsubscribe = receiver.watchPath('baz.jason', () => calledAmount++)

		state.baz.jason = 'Hi'
		provider.sync()

		unsubscribe()

		state.baz.jason = 'Hello, World!'
		provider.sync()

		assertEquals(calledAmount, 1)
	},
})

Deno.test({
	name: 'objects should trigger',
	fn() {
		const state = { foo: 'bar', baz: { bob: true, jack: true, sampson: 10, jason: 'Hello, World!' } }

		const receiver = makeJsonSyncReceiver()
		const provider = makeJsonSyncProvider(state, {
			sendChanges(changes) {
				receiver.applyChanges(changes)
			},
		})

		receiver.setState(provider.getState())

		let bazCalled = false
		receiver.watchPath('baz', () => (bazCalled = true))

		let jackCalled = false
		receiver.watchPath('baz.jack', () => (jackCalled = true))

		state.baz.jack = false
		provider.sync()

		assert(bazCalled)
		assert(jackCalled)
	},
})

Deno.test({
	name: 'array actions should work',
	fn() {
		const state = { foo: 'bar', baz: ['bob', 'jack', 'sampson', 'json'] }

		const receiver = makeJsonSyncReceiver()
		const provider = makeJsonSyncProvider(state, {
			sendChanges(changes) {
				receiver.applyChanges(changes)
			},
		})

		receiver.setState(provider.getState())

		let bazCallAmount = 0
		receiver.watchPath('baz', newValue => {
			bazCallAmount++

			switch (bazCallAmount) {
				case 1:
					assertEquals(newValue[0], 'bill')
					break

				case 2:
					assertEquals(newValue, ['bill', 'jack'])
			}
		})

		state.baz[0] = 'bill'
		provider.sync()

		state.baz.pop()
		state.baz.pop()
		provider.sync()

		assertEquals(bazCallAmount, 2)
	},
})
