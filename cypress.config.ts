import { defineConfig } from 'cypress'
import path from 'path'
import fs from 'fs'
import { FileActions } from './cypress/support/constants'
import dotenv from 'dotenv'
dotenv.config()

interface GetSetFileContentsObject {
  fileAction: FileActions; 
  fileName: string; 
  data?: object
}

export default defineConfig({
  e2e: {
    specPattern: 'cypress/jobs/*.ts',
    chromeWebSecurity: false,
    pageLoadTimeout: 120000,
    setupNodeEvents(on, config) {
      on('task', {
        log(message) {
          console.log(message)
          return null
        },
        getSetFileContents({ fileAction, fileName, data = {} }: GetSetFileContentsObject) {
          if (fileName != 'ignore' && fileName != 'investigate') {
            throw new Error(`Unexpected file name (${fileName}).`)
          }

          const filePath = path.join(process.cwd() + `\\cypress\\fixtures\\${fileName}.json`)

          if (fileAction == FileActions.GET) {
            const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'))
            return fileData
          }

          if (fileAction == FileActions.SET) {
            fs.writeFileSync(filePath, JSON.stringify(data))
            return null
          }
        }
      })
    },
    env: {
      cwJobsBaseUrl: 'https://www.cwjobs.co.uk',
      totalJobsUrl: 'https://www.totaljobs.com',
      cwjobsUsername: process.env.CWJOBSUSERNAME,
      totaljobsUsername: process.env.TOTALJOBSUSERNAME,
      cwjobsPassword: process.env.CWJOBSPASSWORD,
      totaljobsPassword: process.env.TOTALJOBSPASSWORD,
      applicantFirstName: process.env.APPLICANTFIRSTNAME
    }
  },
})
