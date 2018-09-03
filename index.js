
const sprintf = require('sprintf-js').sprintf;
const properties = require('./properties.json');
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
    request(`/groups/${groupId}/milestones/${milestoneId}/issues`, (err, res, issues) => {
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
        breakdown += sprintf('%20s: %d\n', entry[0], entry[1]);
    });
    breakdown += '---------------------------------\n';
    breakdown += sprintf('%20s: %d\n', 'Total', entries.reduce((acc, val) => acc + val[1] ,0));
    return breakdown;
}

function producebreakdown(issues) {
    var breakdown = ""
    // breakdown = generateIssueBreakdown(issues);
    breakdown += '---------------------------------\n';
    breakdown += generateStoryPointBreakdown(issues);
    console.log(breakdown);
}

getGroupId(properties.groupName, groupId => {
    getMilestoneId(groupId, properties.milestoneName, milestoneId => {
        getIssues(groupId, milestoneId, producebreakdown)
    })
})

