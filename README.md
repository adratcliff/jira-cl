# Jira Command Line

![Jira Command Line Logo](/jcl.png)

Command line interface for managing Jira issues through the Chrome Developer Tools Console.

Exposes the functions
 * `jcl.getIssue(key, fields = 'summary,status')`
 * `jcl.getIssueTransitions(key)`
 * `jcl.issueSearch(jql, { fields = ['summary', 'status'], startAt = 0, maxResults = 50 })`
 * `jcl.moveIssue(key, target = 'Release', resolution = 'done')`
 * `jcl.moveBulkIssues(key, target = 'Release', resolution = 'done)`

Implements the API as specified at [Jira API Docs](https://docs.atlassian.com/software/jira/docs/api/REST/9.14.0/)

### Installation

1. Clone repository.
2. In [Chrome extension manager](chrome://extensions/) enable `Developer mode` in the top right
3. In the top left, click `Load unpacked`
4. Select cloned directory