export function customElement(tagName: string) {
	return (target: CustomElementConstructor) => {
		customElements.define(tagName, target);
	};
}

export function property<T>(options: { type: any, attribute?: string } = { type: String }) {
	return function (target: any, propertyKey: string) {
		// Add to observed attributes
		const constructor = target.constructor;
		if (!constructor.observedAttributes) {
			constructor.observedAttributes = [];
		}
		const attribute = options.attribute || propertyKey.toLowerCase();
		if (!constructor.observedAttributes.includes(attribute)) {
			constructor.observedAttributes.push(attribute);
		}

		// Storage key
		const key = Symbol(propertyKey);

		// Create property descriptor
		Object.defineProperty(target, propertyKey, {
			get() {
				return this[key];
			},
			set(value: T) {
				const oldValue = this[key];
				// Handle boolean attributes
				if (options.type === Boolean) {
					console.log(`Value: ${value}`)
					if (value === 'false') console.log("this is false")

					this[key] = value === '' || value === 'true' || value === true;
				} else {
					this[key] = value;
				}
				if (this.requestUpdate) {
					this.requestUpdate(propertyKey, oldValue, this[key]);
				}
			},
			enumerable: true,
			configurable: true,
		});
	};
}

export function state() {
	return function (target: any, propertyKey: string) {
		// Storage key
		const key = Symbol(propertyKey);

		// Create property descriptor
		Object.defineProperty(target, propertyKey, {
			get() {
				return this[key];
			},
			set(value: any) {
				const oldValue = this[key];
				this[key] = value;
				if (this.requestUpdate) {
					this.requestUpdate(propertyKey, oldValue, value);
				}
			},
			enumerable: true,
			configurable: true,
		});
	};
}