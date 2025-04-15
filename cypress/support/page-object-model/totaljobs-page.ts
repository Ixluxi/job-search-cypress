export default class TotaljobsPage {
    get acceptCookiesButton() {
        return cy.get('div#ccmgt_explicit_accept>div')
    }

    get firstSignInButton() {
        return cy.contains('Sign in')
    }

    get emailAddressTextBox() {
        return cy.get('input[name="email"]')
    }

    get passwordTextBox() {
        return cy.get('input[name="password"]')
    }

    get loginButton() {
        return cy.get('button[data-testid="login-submit-btn"]')
    }
}