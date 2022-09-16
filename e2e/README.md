#BRAINDUMP



#REQUIREMENTS

- CodeSpaces on a GH Repo https://github.com/TeamCodeStream/python_clm_demo
  https://github.com/TeamCodeStream/python_clm_demo/codespaces
- CodeStream user[s]
- GitHub user
- Cookies for CodeSpaces/GitHub?

#THOUGHTS

- ordering of tests
  - do we spin up codespace for _each_ test or set of tests, or do we spin it up once for _certain_ scenarios? (signin vs signup vs signup with N providers). it will be slow to spin up for each test
    https://stackoverflow.com/questions/68000771/run-grouped-tests-sequentially-using-playwright
- will need a codestream username + password (with team)
- GH repo
- codespaces auth (currently cookies, relies on a GH user)
