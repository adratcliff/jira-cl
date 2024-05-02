'use strict'

const api = 'https://yabbrit.atlassian.net/rest/api/2';
const apiKey = ''
const headers = {
  'content-type': 'application/json',
  'authorization': `Basic ${apiKey}`,
};

const transitionMaps = {
  'Release': [
    { status: 'Open', transition: '11', target: 'In Progress' },
    { status: 'In Progress', transition: '21', target: 'Ready For Review' },
    { status: 'Pending 1st Review', transition: '201', target: 'Start Review' },
    { status: 'Under 1st Review', transition: '31', target: 'Approve' },
    { status: 'Pending 2nd Review', transition: '281', target: 'Start Review' },
    { status: 'Under 2nd Review', transition: '261', target: 'Mergeable' },
    { status: 'Merge', transition: '221', target: 'Merge' },
    { status: 'Merged', transition: '231', target: 'Release' },
  ],
  'Merge': [
    { status: 'Open', transition: '11', target: 'In Progress' },
    { status: 'In Progress', transition: '21', target: 'Ready For Review' },
    { status: 'Pending 1st Review', transition: '201', target: 'Start Review' },
    { status: 'Under 1st Review', transition: '31', target: 'Approve' },
    { status: 'Pending 2nd Review', transition: '281', target: 'Start Review' },
    { status: 'Under 2nd Review', transition: '261', target: 'Mergeable' },
    { status: 'Merge', transition: '221', target: 'Merge' },
  ],
};

const resolutions = {
  done: {
    "description" : "Work has been completed on this issue.",
    "id" : "10000",
    "name" : "Done",
  },
  wontDo: {
    "description" : "This issue won't be actioned.",
    "id" : "10001",
    "name" : "Won't Do",
  },
  duplicate: {
    "description" : "The problem is a duplicate of an existing issue.",
    "id" : "10002",
    "name" : "Duplicate",
  },
  noReproduce: {
    "description" : "All attempts at reproducing this issue failed, or not enough information was available to reproduce the issue. Reading the code produces no clues as to why this behavior would occur. If more information appears later, please reopen the issue.",
    "id" : "10003",
    "name" : "Cannot Reproduce",
  },
};

const resolutionMap = {
  'Release': resolutions.done
};

const issueSearch = async (jql, config = {}) => {
  const {
    fields = ['summary', 'status'],
    startAt = 0,
    maxResults = 50,
  } = config;

  const searchRequest = await fetch(`${api}/search`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      startAt,
      maxResults,
      fields,
      jql,
    }),
  });

  const { issues } = await searchRequest.json();

  return issues.map(({ id, key, fields }) => ({ id, key, summary: fields.summary, status: { id: fields.status.id, name: fields.status.name } }));
};

const getIssue = async (key, fields = 'summary,status') => {
  const issueRequest = await fetch(`${api}/issue/${key}?fields=${fields}`, {
    method: 'GET',
    headers,
  });

  const issue = await issueRequest.json();

  return issue;
};

const getIssueTransitions = async (key) => {
  const transitionRequest = await fetch(`${api}/issue/${key}/transitions`, {
    method: 'GET',
    headers,
  });

  const transitions = await transitionRequest.json();

  return transitions;
};

const updateIssue = async (key, data) => {
  const updateRequest = await fetch(`${api}/issue/${key}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  });

  return updateRequest.status;
};

const transitionIssue = async (key, transitionId) => {
  const transitionRequest = await fetch(`${api}/issue/${key}/transitions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      transition: {
        id: transitionId,
      },
    }),
  });

  return transitionRequest.status === 204;
};

const moveIssue = async (key, target = 'Release', resolution = '') => {
  if (!(target in transitionMaps)) return `Unknown transition target ${target}. Available options are: ${Object.keys(transitionMaps).join(', ')}`;

  const issue = await getIssue(key);

  let targetIndex = transitionMaps[target].findIndex(map => map.status === issue.fields.status.name);

  if (targetIndex === -1) return `Could not find a transition for ${key}`;
  if (!transitionMaps[target][targetIndex].transition) return `${key} has no transition pathway for ${target}. It is currently ${issue.fields.status.name}.`;

  const doTransition = async () => {
    const success = await transitionIssue(key, transitionMaps[target][targetIndex].transition);

    if (!success) return `Failed to transition ${key} from ${issue.fields.status.name} to ${transitionMaps[target][targetIndex].target}`;
    if (targetIndex + 1 === transitionMaps[target].length || !transitionMaps[target][targetIndex + 1].transition) {
      console.log(`${key} has no further transitions to ${target}. Successfully transitioned to ${transitionMaps[target][targetIndex].target}.`);
      return true;
    }

    targetIndex += 1;
    return doTransition();
  };

  const transitionSuccess = await doTransition();

  if (transitionSuccess !== true) return transitionSuccess;

  const targetResolution = resolution && (resolution in resolutions) ? resolutions[resolution] : (target in resolutionMap ? resolutionMap[target] : false);

  if (!targetResolution) return `${target} transition for ${key} has no resolutions.`;

  return await updateIssue(key, {
    fields: {
      resolution: targetResolution,
    },
  });
};

const moveBulkIssues = async (search, target = 'Release', resolution = '') => {
  const issues = await issueSearch(search);
  const moves = issues.map(issue => moveIssue(issue.key, target, resolution));
  const moveResults = await Promise.allSettled(moves);
  return moveResults;
};

window.jcl = {
  getIssue,
  getIssueTransitions,
  issueSearch,
  moveIssue,
  moveBulkIssues,
};