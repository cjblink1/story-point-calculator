
const sprintf = require('sprintf-js').sprintf;
const properties = require('./properties.json');
const request = require('request').defaults({
    headers: {'Private-Token': properties.accessToken},
    baseUrl: properties.baseUrl,
    encoding: 'utf-8',
    json: true
});

function getGroupId(groupName, callback) {
    request(`/groups?search=${properties.groupName}`, (err, res, groups) => {
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
    var breakdown = "";
    const entries = Array.from(spMap.entries()).sort((a,b) => b[1] - a[1]);
    entries.forEach(entry => {
        breakdown += sprintf('%20s: %d\n', entry[0], entry[1]);
    });
    return breakdown;
}

function produceReport(issues) {
    var report = ""
    report += `Issues for ${properties.milestoneName}:\n\n`
    issues.forEach(issue => {
        report += `${getTitle(issue)}\n`;
        report += `Story Points: ${getStoryPoints(issue)}\n`;
        report += `Assignee: ${getAssignee(issue)}\n\n`;
    });
    report += '---------------------------------\n'
    report += generateStoryPointBreakdown(issues)
    console.log(report);
}

getGroupId(properties.groupName, groupId => {
    getMilestoneId(groupId, properties.milestoneName, milestoneId => {
        getIssues(groupId, milestoneId, produceReport)
    })
})

