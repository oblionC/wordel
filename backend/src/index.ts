import { DurableObject } from 'cloudflare:workers';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
	'Access-Control-Max-Age': '86400',
};
// function handleOptions(request: Request) {
// 	// Make sure the necessary headers are present
// 	// for this to be a valid pre-flight request
// 	let headers = request.headers;
// 	if (
// 		headers.get('Origin') !== null &&
// 		headers.get('Access-Control-Request-Method') !== null &&
// 		headers.get('Access-Control-Request-Headers') !== null
// 	) {
// 		// Handle CORS pre-flight request.
// 		// If you want to check or reject the requested method + headers
// 		// you can do that here.
		
// 		let accessControlRequestHeaders = request.headers.get('Access-Control-Request-Headers');
// 		let respHeaders;
// 		if(accessControlRequestHeaders) {
// 			respHeaders = new Headers({
// 				...corsHeaders,
// 				// Allow all future content Request headers to go back to browser
// 				// such as Authorization (Bearer) or X-Client-Name-Version
// 				'Access-Control-Allow-Headers': accessControlRequestHeaders,
// 			});
// 		}
// 		else {
// 			respHeaders = corsHeaders;
// 		}
// 		return new Response(null, {
// 			headers: respHeaders,
// 		});
// 	} else {
// 		// Handle standard OPTIONS request.
// 		// If you want to allow other HTTP Methods, you can do that here.
// 		return new Response(null, {
// 			headers: {
// 				Allow: 'GET, HEAD, POST, OPTIONS',
// 			},
// 		});
// 	}
// }
// async function handleRequest(request: Request) {
// 	console.log(request);
// 	let response;
// 	if (request.method === 'OPTIONS') {
// 		response = handleOptions(request);
// 	} else {
// 		response = await fetch(request);
// 		response = new Response(response.body, response);
// 		response.headers.set('Access-Control-Allow-Origin', '*');
// 		response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
// 	}
// 	return response;
// }
// addEventListener('fetch', (event) => {
// 	event.respondWith(handleRequest(event.request).catch((err) => new Response(err.stack, { status: 500 })));
// });

interface CheckWordObject {
	colors: Array<string>;
	playerWon: boolean;
	solution: string;
}

const WORDS_API = 'https://api.frontendexpert.io/api/fe/wordle-words';
/**
 * Welcome to Cloudflare Workers! This is your first Durable Objects application.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your Durable Object in action
 * - Run `npm run deploy` to publish your application
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/durable-objects
 */

/** A Durable Object's behavior is defined in an exported Javascript class */
export class WordelSolution extends DurableObject<Env> {
	/**
	 * The constructor is invoked once upon creation of the Durable Object, i.e. the first call to
	 * 	`DurableObjectStub::get` for a given identifier (no-op constructors can be omitted)
	 *
	 * @param ctx - The interface for interacting with Durable Object state
	 * @param env - The interface to reference bindings declared in wrangler.jsonc
	 */

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
	}

	/**
	 * The Durable Object exposes an RPC method sayHello which will be invoked when when a Durable
	 *  Object instance receives a request from a Worker via the same method invocation on the stub
	 *
	 * @param name - The name provided to a Durable Object instance from a Worker
	 * @returns The greeting to be sent back to the Worker
	 */
	async sayHello(): Promise<string> {
		return `working`;
	}

	async setNewSolution() {
		const response = await fetch(WORDS_API);
		const wordsList: Array<string> = await response.json();
		let solution = wordsList[Math.floor(Math.random() * wordsList.length)];
		this.ctx.storage.put("solution", solution);
	}
	
	async getSolution() {
		return this.ctx.storage.get("solution");
	}

	async checkWord(word: string): Promise<CheckWordObject> {
		let colors = [];
		let index = 0;
		let solution: string = await this.ctx.storage.get("solution") || "hello";	
		solution = solution.toLowerCase();
		for (let letter of word) {
			let color = '';
			if (letter === solution[index]) {
				color = 'green';
			} else if (solution.includes(letter)) {
				let count = 0;
				for (let i = 0; i < solution.length; i++) {
					if (solution[i] === letter) count++;
					if (solution[i] === letter && solution[i] === word[i]) count--;
				}
				for (let i = 0; i < index; i++) {
					if (word[i] === letter) count--;
				}
				if (count > 0) {
					color = 'orange';
				} else {
					color = 'gray';
				}
			} else if (letter) {
				color = 'gray';
			}
			colors.push(color);
			index++;
		}

		return {
			colors: colors,
			playerWon: word === solution,
			solution: solution,
		};
	}
}

export default {
	/**
	 * This is the standard fetch handler for a Cloudflare Worker
	 *
	 * @param request - The request submitted to the Worker from the client
	 * @param env - The interface to reference bindings declared in wrangler.jsonc
	 * @param ctx - The execution context of the Worker
	 * @returns The response to be sent back to the client
	 */
	async fetch(request, env, ctx): Promise<Response> {
		const url: URL = new URL(request.url);
		const word: string | null = url.searchParams.get('word');

		const id: DurableObjectId = env.WORDEL_SOLUTION.idFromName('main');
		const stub = env.WORDEL_SOLUTION.get(id);
		switch (url.pathname) {
			case '/': {
				if (word) {
					const checkWordObject = await stub.checkWord(word);
					let response = new Response(JSON.stringify(checkWordObject));
					Object.keys(corsHeaders).forEach((header) => {
						response.headers.set(header, corsHeaders[header as keyof typeof corsHeaders]);
					})
					return response;
				}
				return new Response();
			}
			default: {
				const greeting = await stub.sayHello();
				return new Response(greeting);
			}
		}
	},
	async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
		const id: DurableObjectId = env.WORDEL_SOLUTION.idFromName('main');
		const stub = env.WORDEL_SOLUTION.get(id);
		await stub.setNewSolution();
		console.log(stub.getSolution());
	}
} satisfies ExportedHandler<Env>;
