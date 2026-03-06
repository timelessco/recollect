// @ts-nocheck

/* eslint-disable @typescript-eslint/method-signature-style */
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference types="cypress" />
// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })
//
// declare global {
//   namespace Cypress {
//     interface Chainable {
//       login(email: string, password: string): Chainable<void>
//       drag(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
//       dismiss(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
//       visit(originalFn: CommandOriginalFn, url: string, options: Partial<VisitOptions>): Chainable<Element>
//     }
//   }
// }

// @ts-expect-error - This is a valid global declaration
declare global {
	namespace Cypress {
		interface Chainable {
			/**
			 * Custom command to select DOM element by data-cy attribute.
			 * @example cy.dataCy('greeting')
			 */
			login(email: string, pw: string): Chainable<JQuery<HTMLElement>>;
			addBookmark(url: string): Chainable<JQuery<HTMLElement>>;
			checkFistBookmarkUrl(url: string): Chainable<JQuery<HTMLElement>>;
			checkNotFistBookmarkUrl(url: string): Chainable<JQuery<HTMLElement>>;
		}
	}
}

Cypress.Commands.add("login", (email, pw) => {
	cy.get("#email").type(email);
	cy.get("#password").type(pw);
	cy.get("#sign-in-button").click();
	cy.wait(5000);
});

Cypress.Commands.add("addBookmark", (url) => {
	cy.wait(1000);
	cy.get("body").type("{cmd}k");
	cy.get("#add-url-input").type(`${url}{enter}`);
});

Cypress.Commands.add("checkFistBookmarkUrl", (url) => {
	cy.get(
		":nth-child(1) > :nth-child(1) > a > .p-4 > .space-y-2 > .flex > [data-base-url]",
	).should("have.text", url);
});

Cypress.Commands.add("checkNotFistBookmarkUrl", (url) => {
	cy.get(
		":nth-child(1) > :nth-child(1) > a > .p-4 > .space-y-2 > .flex > [data-base-url]",
	).should("not.have.text", url);
});

// eslint-disable-next-line unicorn/require-module-specifiers
export {};
