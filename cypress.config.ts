import { defineConfig } from 'cypress'
import path from 'path'
import fs from 'fs'
import dotenv from 'dotenv'
dotenv.config()

export default defineConfig({
  e2e: {
    specPattern: 'cypress/jobs/*.ts',
    chromeWebSecurity: false,
    setupNodeEvents(on, config) {
      on('task', {
        log(message) {
          console.log(message)
          return null
        },
        getFileContents(type: string) {
          let fileName

          switch (type) {
            case 'ignore':
              fileName = type
              break
            case 'manualApplications':
              fileName = 'apply-manually'
              break
            default: throw new Error(`Invalid type (${type}).`)
          }

          const applicationsPath = path.join(process.cwd() + `\\cypress\\fixtures\\${fileName}.json`)
          const fileData = JSON.parse(fs.readFileSync(applicationsPath, 'utf8'))

          return fileData
        },
        setFileContents({ data = {}, type = '' }) {
          let fileName

          switch (type) {
            case 'ignore':
              fileName = type
              break
            case 'manualApplications':
              fileName = 'apply-manually'
              break
            default: throw new Error(`Invalid type (${type}).`)
          }

          const applicationsPath = path.join(process.cwd() + `\\cypress\\fixtures\\${fileName}.json`)
          fs.writeFileSync(applicationsPath, JSON.stringify(data))
          
          return null
        },
      })
    },
    env: {
      cwJobsBaseUrl: 'https://www.cwjobs.co.uk',
      totalJobsUrl: 'https://www.totaljobs.com',
      cwjobsPassword: process.env.CWJOBSPASSWORD
    }
  },
})
