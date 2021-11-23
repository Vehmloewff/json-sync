export type Data = Record<string, unknown> | Data[]
export type Value = string | number | boolean | null
export type Flattened = Record<string, Value>

export type Change = DeleteChange | SetChange

export interface DeleteChange {
	$: 'D'
	/** The path of the item that was deleted */
	p: string
}

export interface SetChange {
	$: 'S'
	/** The path of the item that was set */
	p: string
	/** The value the item was set to */
	v: Value
}
