import { DurableObject } from "cloudflare:workers";

interface CheckWordObject {
	colors: Array<string>,
	playerWon: boolean,
	solution: string
}

const WORDS_API = "https://api.frontendexpert.io/api/fe/wordle-words";

async function setNewSolution() {
	const response = await fetch(WORDS_API);
	const wordsList: Array<string> = await response.json();
	return(wordsList[Math.floor(Math.random() * wordsList.length)])
}

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

	solution: string = "guest";

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
		let word = await setNewSolution();
		return `${word}`;
	}

	async checkWord(word: string): Promise<CheckWordObject> {
		let colors = [];
		let index = 0;
		for(let letter of word) {
			let color = "";
			if(letter === this.solution[index]) {
				color = "green";
			}
			else if(this.solution.includes(letter)) {
				let count = 0;
				for(let i = 0; i < this.solution.length; i++) {
					if(this.solution[i] === letter) count++;
					if(this.solution[i] === letter && this.solution[i] === word[i]) count--;
				}
				for(let i = 0; i < index; i++) {
					if(word[i] === letter) count--;
				}
				if(count > 0) {
					color = "orange"
				}
				else {
					color = "gray"
				}
			}
			else if(letter) {
				color = "gray";
			}
			colors.push(color);
			index++;
		}

		return {
			colors: colors,
			playerWon: word === this.solution, 
			solution: this.solution
		}
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
		const word = url.searchParams.get("word"); 

		const id: DurableObjectId = env.WORDEL_SOLUTION.idFromName("main");
		const stub = env.WORDEL_SOLUTION.get(id);
		switch(url.pathname) {
			case "/": {
				const checkWordObject = await stub.checkWord("hello");
				return new Response(JSON.stringify(checkWordObject));
			}
			default: {
				const greeting = await stub.sayHello();
				return new Response(greeting);
			}
		}
	},
} satisfies ExportedHandler<Env>;
