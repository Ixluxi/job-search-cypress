// Essentially the same code but for CWJobs' sister site, separated out regardless
import { runTimeStamp } from '../support/constants'
import { searchTerms } from '../support/constants'
import { jobInclusionList } from '../support/constants'
import { jobExclusionList } from '../support/constants'
import { generateRandomNumber } from '../support/utilities'
let ignoreList: string[] = []

it('Total jobs', () => {
    cy.visit(Cypress.env('totalJobsUrl'))
    cy.wait(generateRandomNumber())
    cy.get('div#ccmgt_explicit_accept>div').click()
    cy.contains('Sign in').click()
    cy.get('input[name="email"]').type('axdskhmd@hotmail.com')
    cy.get('input[name="password"]').type(Cypress.env('cwjobsPassword'))
    cy.get('button[data-testid="login-submit-btn"]').click()
    cy.wait(generateRandomNumber())
    cy.contains('h1', 'Hi, Alex')

    for (const searchTerm of searchTerms) {
        let manualApplicationsFileData: object[] = []

        cy.task('getFileContents', 'manualApplications').then(manualApplications => {
            cy.task('getFileContents', 'ignore').then(ignoreUrls => {
                manualApplicationsFileData = manualApplications
                ignoreList = ignoreUrls

                cy.visit(`https://www.totaljobs.com/jobs/permanent/${searchTerm}?salary=50000&salarytypeid=1&sort=3&action=facet_selected%3bage%3b3&postedWithin=3`, { timeout: 120000 }).then(() => {
                    cy.wait(generateRandomNumber()).then(() => {
                        cy.get('[data-testid="job-item-title"]').then(jobs => {
                            for (const job of jobs) {
                                const jobLink = Cypress.env('totalJobsUrl') + Cypress.$(job).attr('href')

                                if (!ignoreList.includes(jobLink)) {
                                    const jobTitle = Cypress.$(job).text()
                                    const jobTitleContainsIncludedSearchTerms = jobInclusionList.some(word => jobTitle.toLowerCase().includes(word.toLowerCase()))
                                    const jobTitleContainsExcludedSearchTerms = jobExclusionList.some(word => jobTitle.toLowerCase().includes(word.toLowerCase()))

                                    if (jobTitleContainsIncludedSearchTerms && !jobTitleContainsExcludedSearchTerms) {
                                        const salaryMatches = Cypress.$(job).parent().siblings('div').find('[data-at="job-item-salary-info"]').text().match(new RegExp(/(\d{2})[,|k|\d]/gm))

                                        let highestSalary = 0

                                        if (salaryMatches) {
                                            highestSalary = parseInt(salaryMatches[2]) || parseInt(salaryMatches[1])
                                        }

                                        if (!salaryMatches || (salaryMatches && highestSalary >= 45)) {
                                            cy.wait(generateRandomNumber()).then(() => {
                                                // handle non-200 status codes (sometimes hit 502 bad gateway)
                                                cy.intercept(jobLink).as('pageVisit')
                                                cy.visit(jobLink, { failOnStatusCode: false }).then(() => {
                                                    cy.wait('@pageVisit').then(({ response }) => {
                                                        if (response.statusCode >= 200 && response.statusCode <= 299) {
                                                            cy.get('body').then(element => {
                                                                const pageLoadedSuccessfully = !Cypress.$(element).text().toLowerCase().includes('maintenance page') && !Cypress.$(element).text().toLowerCase().includes('Sorry, we could not load')

                                                                if (pageLoadedSuccessfully) {
                                                                    cy.wait(generateRandomNumber()).then(() => {
                                                                        cy.url().then(url => {
                                                                            if (url == jobLink) {
                                                                                cy.contains('button', /Apply|Continue application|Already applied/).then(button => {
                                                                                    const isPermanent = Cypress.$(button).parents('article').find('[data-at="metadata-work-type"] [data-genesis-element="TEXT"] span').text().includes('Permanent')

                                                                                    // accounts for jobs previously applied for but not recorded locally
                                                                                    const haveApplied = Cypress.$(button).text().includes('Already applied') && !ignoreList.includes(jobLink)

                                                                                    if (haveApplied) {
                                                                                        ignoreList.push(jobLink)
                                                                                    }

                                                                                    cy.get('.at-section-text-jobDescription-content').then(element => {
                                                                                        const jobDescriptionContainsExcludedSearchTerms = jobExclusionList.some(word => Cypress.$(element).text().toLowerCase().includes(word.toLowerCase()))

                                                                                        if (!jobDescriptionContainsExcludedSearchTerms) {
                                                                                            if (!haveApplied && isPermanent) {
                                                                                                button.click()

                                                                                                cy.wait(generateRandomNumber()).then(() => {
                                                                                                    cy.url().then(url => {
                                                                                                        let canApply = url.includes('ApplyExpress')

                                                                                                        if (canApply) {
                                                                                                            cy.get('[data-testid="sendApplication"]', { timeout: 15000 }).click().then(() => {
                                                                                                                // can be redirected to another domain, fix for cross-origin exception
                                                                                                                cy.intercept('**').as('networkRequest')

                                                                                                                cy.wait('@networkRequest').then(interception => {
                                                                                                                    if (interception.response.url.includes('application/confirmation/success')) {
                                                                                                                        ignoreList.push(jobLink)
                                                                                                                    } else {
                                                                                                                        // might be taken to external or multi-step application process
                                                                                                                        canApply = false
                                                                                                                    }
                                                                                                                })
                                                                                                            })
                                                                                                        }

                                                                                                        if (!canApply) {
                                                                                                            manualApplicationsFileData.push({
                                                                                                                timestamp: runTimeStamp,
                                                                                                                searchTerm: searchTerm,
                                                                                                                title: jobTitle,
                                                                                                                url: jobLink,
                                                                                                                investigated: false
                                                                                                            })

                                                                                                            ignoreList.push(jobLink)
                                                                                                        }
                                                                                                    })
                                                                                                })
                                                                                            }
                                                                                        } else {
                                                                                            ignoreList.push(jobLink)
                                                                                        }
                                                                                    })
                                                                                })
                                                                            }
                                                                        })
                                                                    })
                                                                }
                                                            })
                                                        }
                                                    })
                                                })
                                            })
                                        }
                                    }
                                }
                            }
                        })
                    })
                })
            })
        }).then(() => {
            cy.task('setFileContents', { data: manualApplicationsFileData, type: 'manualApplications' })
            cy.task('setFileContents', { data: [...new Set(ignoreList)], type: 'ignore' })
        })
    }
})