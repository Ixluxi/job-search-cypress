### Setup

1. After cloning this framework, run `npm install`

2. Add an .env file to the project root containing the following.

```
CWJOBSPASSWORD="changeme"
TOTALJOBSPASSWORD="changeme"
CWJOBSUSERNAME="changeme"
TOTALJOBSUSERNAME="changeme"
APPLICANTFIRSTNAME="changeme"
```

3. Change all instances of 'changeme' to your details.

4. Run `npx cypress run --browser chrome` to run the framework and apply for jobs.
    - Chrome specified because Electron can hit a memory limit.

5. After running the framework, format and investigate the roles in `investigate.json` - either set each role's `investigated` to `true` or remove the object that represents that role.

### Notes

1. You can modify the minimum salary and number of days in the past to search for jobs by editing `salaryFrom` and `postedWithin`.
- Salaries must be rounded, e.g. 30000, 40000, 50000.
- Valid days are 1, 3, 7, 14.

2. To automatically apply for the roles currently listed in `ignore.json`, remove the specific role object(s) or empty the array.

3. On the assumption you've emptied `ignore.json`'s array, the application process can take a long time and you may encounter ESOCKETTIMEDOUT errors. This is mitigated/solved by reducing the workload and building up the ignore list:
    1. Limit the run to one search term (in `constants.ts`, comment-out all but one search term), and
    2. Set the number of days in the past to search for jobs for to 1 (`postedWithin=1`), and
    3. Repeat the run until you've built up the ignore list and you stop getting ESOCKETTIMEDOUT errors
    4. Release the brakes and uncomment the search terms in `constants.ts`