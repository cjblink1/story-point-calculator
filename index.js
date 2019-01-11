#!/usr/bin/env node
const https = require('https');
const path = require('path');
const os = require('os');
const colors = require('colors');
const sprintf = require('sprintf-js').sprintf;
const properties = require(path.resolve(os.homedir(), '.sp/properties.json'));
const request = require('request').defaults({
    headers: {'Private-Token': properties.accessToken},
    baseUrl: properties.baseUrl,
    encoding: 'utf-8',
    json: true
});

function getGroupId(groupName, callback) {
    request(`/groups?search=${groupName}`, (err, res, groups) => {
        callback(groups[0].id);
    })
}

function getMilestoneId(groupId, milestoneName, callback) {
    request(`/groups/${groupId}/milestones?search="${milestoneName}"`, (err, res, milestones) => {
        callback(milestones[0].id)
    })
}

function getIssues(groupId, milestoneId, callback) {
    request(`/groups/${groupId}/milestones/${milestoneId}/issues?per_page=100`, (err, res, issues) => {
        callback(issues)
    })
}

function getTitle(issue) {
    return issue.title;
}

function getStoryPoints(issue) {
    return issue.time_stats.time_estimate / 3600;
}

function getAssignee(issue) {
    return issue.assignee ? issue.assignee.name : 'unassigned';
} 

function generateIssueBreakdown(issues) {
    var breakdown = "";
    breakdown += `Issues for ${properties.milestoneName}:\n\n`
    issues.forEach(issue => {
        breakdown += `${getTitle(issue)}\n`;
        breakdown += `Story Points: ${getStoryPoints(issue)}\n`;
        breakdown += `Assignee: ${getAssignee(issue)}\n\n`;
    });
    return breakdown;
}

function generateStoryPointBreakdown(issues) {
    let spMap = new Map()
    issues.forEach(issue => {
        var assigneeSp = 0;
        let issueSp = getStoryPoints(issue)
        if (spMap.has(getAssignee(issue))) {
            assigneeSp = spMap.get(getAssignee(issue));
        }
        spMap.set(getAssignee(issue), assigneeSp + issueSp)
    });
    var breakdown = `${properties.milestoneName}\n\n`;
    const entries = Array.from(spMap.entries()).sort((a,b) => b[1] - a[1]);
    entries.forEach(entry => {
        const format = '%20s';
        breakdown += sprintf(entry[1] < 3 && entry[0] != 'unassigned' ? format.red : format, entry[0]);
        breakdown += sprintf(': %d\n', entry[1]);
    });
    breakdown += '---------------------------------\n';
    const total = entries.reduce((acc, val) => acc + val[1] ,0)
    const format = '%20s';
    breakdown += sprintf(total < properties.teamSize * 3 ? format.yellow : format.green, 'Total');
    breakdown += sprintf(': %d\n', total)
    return breakdown;
}

function producebreakdown(issues) {
    var breakdown = ""
    // breakdown = generateIssueBreakdown(issues);
    breakdown += '---------------------------------\n';
    breakdown += generateStoryPointBreakdown(issues);
    console.log(breakdown);
}

https.get(properties.baseUrl, function (res) {
    getGroupId(properties.groupName, groupId => {     
      getMilestoneId(groupId, properties.milestoneName, milestoneId => {
            getIssues(groupId, milestoneId, producebreakdown)
        })
      })
    }).on('error', function(e) {
        var errorMessage = '\n';
        errorMessage += '----------------------------------------------\n';
        errorMessage += `GitLab: ${properties.baseUrl}\n`
        errorMessage +='seems to be down, please try again later\n';
        errorMessage += '----------------------------------------------\n';

        console.log(errorMessage);
})
