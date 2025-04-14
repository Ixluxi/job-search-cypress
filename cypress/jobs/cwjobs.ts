/*
* cy.wait is antipattern but necessary to simulate human behaviour on the given job site, avoiding rate limiters etc
*/

import { FileActions } from '../support/constants'
import { searchTerms } from '../support/constants'
import { jobInclusionList } from '../support/constants'
import { jobExclusionList } from '../support/constants'
import { getCurrentTime } from '../support/utilities'
import { generateRandomNumber } from '../support/utilities'
let runTimeIgnore: object[] = []

it('CW jobs', () => {
    cy.visit(Cypress.env('cwJobsBaseUrl'))
    cy.wait(generateRandomNumber())
    cy.get('div#ccmgt_explicit_accept>div').click()
    cy.contains('Sign in').click()
    cy.get('a[data-testid="sign-in"]').click()
    cy.get('input[name="email"]').type('axdskhmd@hotmail.com')
    cy.get('input[name="password"]').type(Cypress.env('cwjobsPassword'))
    cy.get('button[data-testid="login-submit-btn"]').click()
    cy.wait(generateRandomNumber())
    cy.contains('h1', 'Hi, Alex')

    for (const searchTerm of searchTerms) {
        let runTimeInvestigate: object[] = []

        cy.task('getSetFileContents', { fileAction: FileActions.GET, fileName: 'investigate' }).then(investigate => {
            cy.task('getSetFileContents', { fileAction: FileActions.GET, fileName: 'ignore' }).then(ignore => {
                runTimeInvestigate = investigate
                runTimeIgnore = ignore

                cy.visit(`${Cypress.env('cwJobsBaseUrl')}/jobs/permanent/${searchTerm}?salary=30000&salarytypeid=1&action=facet_selected%3bsalary%3b30000%3bsalarytypeid%3b1&postedWithin=3`)

                cy.wait(generateRandomNumber())

                cy.get('[data-testid="job-item-title"]').then(jobs => {
                    for (const job of jobs) {
                        let jobTitle: string
                        let jobLink: string
                        let ignoreNote: string

                        new Cypress.Promise(resolve => {
                            jobLink = Cypress.env('cwJobsBaseUrl') + Cypress.$(job).attr('href')

                            const jobLinkIsInIgnoreList = runTimeIgnore.some((element: any) => element.url == jobLink)

                            if (!jobLinkIsInIgnoreList) {
                                jobTitle = Cypress.$(job).text()
                                const jobTitleContainsIncludedSearchTerms = jobInclusionList.some(word => jobTitle.toLowerCase().includes(word.toLowerCase()))
                                const jobTitleContainsExcludedSearchTerms = jobExclusionList.some(word => jobTitle.toLowerCase().includes(word.toLowerCase()))

                                if (jobTitleContainsIncludedSearchTerms && !jobTitleContainsExcludedSearchTerms) {
                                    // assume salary is unspecified
                                    let highestSalary = null

                                    const salaryMatches = Cypress.$(job).parent().siblings('div').find('[data-at="job-item-salary-info"]').text().match(/([1-9]\d)(?:\d|,|k)*/gm)

                                    if (salaryMatches) {
                                        // if salary is specified, get the only salary referenced, or if it's a salary range, the highest of the two
                                        highestSalary = parseInt(salaryMatches[salaryMatches.length - 1].slice(0, 2))
                                    }

                                    if (highestSalary == null || highestSalary >= 50) {
                                        cy.wait(generateRandomNumber())

                                        // handle non-200 status codes (sometimes hit 502 bad gateway)
                                        cy.intercept(jobLink).as('pageVisit')

                                        cy.visit(jobLink, { failOnStatusCode: false })

                                        cy.wait('@pageVisit').then(({ response }) => {
                                            if (response.statusCode >= 200 && response.statusCode <= 299) {
                                                cy.get('body').then(element => {
                                                    // for whatever reason, job site may crash and be unable to load the content of the requested page
                                                    const pageLoadedSuccessfully = !Cypress.$(element).text().toLowerCase().includes('maintenance page') && !Cypress.$(element).text().toLowerCase().includes('Sorry, we could not load')

                                                    if (pageLoadedSuccessfully) {
                                                        cy.wait(generateRandomNumber())

                                                        cy.url().then(url => {
                                                            if (url == jobLink) {
                                                                cy.contains('button', /Apply|Continue application|Already applied/).then(button => {
                                                                    const isPermanent = Cypress.$(button).parents('article').find('[data-at="metadata-work-type"] [data-genesis-element="TEXT"] span').text().includes('Permanent')

                                                                    // accounts for jobs previously applied for but not recorded locally
                                                                    const haveApplied = Cypress.$(button).text().includes('Already applied')

                                                                    if (haveApplied) {
                                                                        cy.task('log', `${getCurrentTime()} - ${jobLink} - already applied, added to ignore list.`)

                                                                        ignoreNote = 'Already applied.'

                                                                        resolve(true)
                                                                    } else {
                                                                        cy.get('.at-section-text-jobDescription-content').then(element => {
                                                                            const jobDescriptionContainsExcludedSearchTerms = jobExclusionList.some(word => Cypress.$(element).text().toLowerCase().includes(word.toLowerCase()))

                                                                            if (!jobDescriptionContainsExcludedSearchTerms && isPermanent) {
                                                                                button.click()

                                                                                cy.wait(generateRandomNumber())

                                                                                new Cypress.Promise(resolve => {
                                                                                    cy.url().then(url => {
                                                                                        const canApply = url.includes('ApplyExpress')

                                                                                        if (canApply) {
                                                                                            // can be redirected to another domain (or be otherwise blind to the destination URL), fix for cross-origin exception
                                                                                            cy.intercept('**').as('networkRequest')

                                                                                            // primarily the second Apply button is found with [data-testid="sendApplication"] but button[type="submit"] is also used
                                                                                            // expecting only one button that matches the selector, click the first (only) found
                                                                                            cy.get('[data-testid="sendApplication"], button[type="submit"]', { timeout: 30000 }).first().click()

                                                                                            cy.wait('@networkRequest').then(interception => {
                                                                                                if (interception.response.url.includes('application/confirmation/success')) {
                                                                                                    cy.task('log', `${getCurrentTime()} - ${jobLink} - application successful.`)

                                                                                                    ignoreNote = 'Application successful.'

                                                                                                    resolve(true)
                                                                                                } else {
                                                                                                    // might be taken to external or multi-step application process
                                                                                                    resolve(false)
                                                                                                }
                                                                                            })
                                                                                        } else {
                                                                                            // might be taken to external or multi-step application process
                                                                                            resolve(false)
                                                                                        }
                                                                                    })
                                                                                }).then(success => {
                                                                                    if (!success) {
                                                                                        cy.task('log', `${getCurrentTime()} - ${jobLink} - multi-step or external application process.`)

                                                                                        const jobLinkIsInInvestigateList = runTimeInvestigate.some((element: any) => element.url == jobLink)

                                                                                        if (!jobLinkIsInInvestigateList) {
                                                                                            runTimeInvestigate.push({
                                                                                                searchTerm: searchTerm,
                                                                                                jobTitle: jobTitle,
                                                                                                url: jobLink,
                                                                                                timeStamp: getCurrentTime(),
                                                                                                investigated: false
                                                                                            })
    
                                                                                            ignoreNote = 'Multi-step or external application process.'
    
                                                                                            resolve(true)
                                                                                        }
                                                                                    }
                                                                                })
                                                                            } else {
                                                                                cy.task('log', `${getCurrentTime()} - ${jobLink} job is not permanent or description contains excluded search terms, ignoring.`)

                                                                                ignoreNote = 'Job is not permanent or description contains excluded search terms.'

                                                                                resolve(true)
                                                                            }
                                                                        })
                                                                    }
                                                                })
                                                            }
                                                        })
                                                    }
                                                })
                                            }
                                        })
                                    }
                                } else {
                                    cy.task('log', `${getCurrentTime()} - role '${jobTitle}' unsuitable, ignoring.`)

                                    ignoreNote = `Role unsuitable.`

                                    resolve(true)
                                }
                            }
                        }).then(success => {
                            if (success && ignoreNote) {
                                runTimeIgnore.push({
                                    searchTerm: searchTerm,
                                    jobTitle: jobTitle,
                                    url: jobLink,
                                    timeStamp: getCurrentTime(),
                                    ignoreNote: ignoreNote
                                })
                            }
                        })
                    }
                })
            })
        }).then(() => {
            cy.task('getSetFileContents', { fileAction: FileActions.SET, fileName: 'investigate', data: runTimeInvestigate })
            cy.task('getSetFileContents', { fileAction: FileActions.SET, fileName: 'ignore', data: runTimeIgnore })
        })
    }
})