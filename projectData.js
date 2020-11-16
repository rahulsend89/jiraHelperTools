var https = require('follow-redirects').https;
var fs = require('fs');
var qs = require('querystring');
var rapidviewId = 007;
var projectId = 'projectId';

// var userId = 'UserId';
var randowValue = Math.random()*1000;
var auth = 'Basic tokenData=';
var cookie = 'atlassian.xsrf.token='; // atlassian.xsrf.token=
var year = '2020';
var domain = 'awesome';
var getQueryString = (month,sprintID,projectID,userID)=>{
  var dateData = `"resolved" >= "+${year}+"-"+${month}+"-01" AND "resolved" <= "+${year}+"-"+${month}+"-31"`;
  var timeQueryJQL = `project = ${projectID} AND ${dateData} AND assignee in (${userID}) ORDER BY created DESC`;
  var sprintQueryJQL = 'project = '+projectID+' AND Sprint in ('+sprintID+') AND assignee in ('+userID+') order by created DESC';
  var postData = qs.stringify({
    'jql': (month) ? timeQueryJQL : sprintQueryJQL,
    'decorator': 'none'
  });
  return postData
};
var fetchVelocityData = (sprintID)=>{
  return new Promise((resolve,reject)=>{
    var options = {
      'method': 'GET',
      'hostname': domain+'.atlassian.net',
      'path': '/rest/greenhopper/1.0/rapid/charts/velocity.json?rapidViewId='+rapidviewId+'&_='+randowValue,
      'headers': {
        'Authorization': auth,
        'Cookie': cookie
      },
      'maxRedirects': 20
    };
    var req = https.request(options, function (res) {
      var chunks = [];
      res.on("data", function (chunk) {
        chunks.push(chunk);
      });
      res.on("end", function (chunk) {
        var body = Buffer.concat(chunks);
        var jsonData = JSON.parse(body.toString());
        var sprintIds = jsonData.sprints.map(sprintData=>{
          return {
            id:sprintData.id,
            name:sprintData.name
          }
        });
        var sprintDateOut = [];
        sprintIds.forEach((value)=>{
          var sprintData = jsonData.velocityStatEntries[value.id];
          sprintData.id = value.id;
          sprintData.name = value.name;
          delete sprintData.allConsideredIssueKeys;
          delete sprintData.estimated;
          delete sprintData.completed;
          sprintDateOut.push(sprintData);
        })
        var allSprintID = sprintDateOut.map(data=>{
          return {
            id : data.id,
            name: data.name
          }
        });
        console.table(allSprintID);
        // var filterDataWithSprintId = sprintDateOut.filter(data=>data.id == sprintID);
        resolve(sprintDateOut);
      });
      res.on("error", function (error) {
        reject(error);
        console.error(error);
      });
    });
    req.end();
  });
};
var filterVelocityBySprint = (sprintID, sprintDateOut)=>{
  return new Promise((resolve,reject)=>{
    var filterDataWithSprintId = sprintDateOut.filter(data=>data.id == sprintID);
    resolve(filterDataWithSprintId[0]);
  })
}
var fetchSprintDataForUser = (projectID,sprintID,userID)=>{
  return new Promise((resolve,reject)=>{
    var options = {
      'method': 'POST',
      'hostname': domain+'.atlassian.net',
      'path': '/rest/issueNav/1/issueTable',
      'headers': {
        'x-atlassian-token': 'no-check',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': auth,
        'Cookie': cookie
      },
      'maxRedirects': 20
    };
    var req = https.request(options, function (res) {
      var chunks = [];
      res.on("data", function (chunk) {
        chunks.push(chunk);
      });
      res.on("end", function (chunk) {
        var body = Buffer.concat(chunks);
        var jsonData = JSON.parse(body.toString());
        resolve(jsonData.issueTable.issueKeys);
      });
      res.on("error", function (error) {
        reject(error);
        console.error(error);
      });
    });
    var postData = getQueryString(null,sprintID,projectID,userID);
    req.write(postData);
    req.end();
  });
};
var sprintId = 1276;
var debuffData = (ar)=>{
  return ar.map(data=>{
    return Object.keys(data).map(dataVal=>{
      return dataVal =data[dataVal];
    });
  });
};
let filterAr;
fetchVelocityData().then(allSprintData=>{
  allSprintData.forEach(value=>{
    const sprintID = value.id;
    const sprintName = value.name;
    fetchSprintDataForUser(projectId,sprintID,userId)
      .then(filterVal=>{
        filterAr = filterVal;
        return filterVelocityBySprint(sprintID,allSprintData)
      })
      .then(data=>{
        var filterDataEstimated = data.estimatedEntries.filter(data=>{
          var filterVal = filterAr.includes(data.issueKey);
          return  filterVal;
        });
        var filterDataCompleted = data.completedEntries.filter(data=>{
          var filterVal = filterAr.includes(data.issueKey);
          return filterVal;
        });
        var estimatedPoints = filterDataEstimated.reduce(function(sum,data) {
          if(data.value){
            return sum + data.value;
          }else{
            return sum;
          }
        }, 0);
        var completedPoints = filterDataCompleted.reduce(function(sum,data) {
          if(data.value){
            return sum + data.value;
          }else{
            return sum;
          }
        }, 0);

        var outData = {
          // estimatedStories: debuffData(filterDataEstimated),
          // completedStories: debuffData(filterDataCompleted),
          estimatedPoints,
          completedPoints,
          // sprintID,
          sprintName
        }
        console.table(outData);
      })
      .catch(err=>{
        console.log(err);
      })
  })
})

// fetchSprintDataForUser(projectId,sprintId,userId)
//   .then(filterAr=>{
//     fetchVelocityData(sprintId)
//       .then(data=>{
//         var filterDataEstimated = data.estimatedEntries.filter(data=>{
//           var filterVal = filterAr.includes(data.issueKey);
//           return  filterVal;
//         });
//         var filterDataCompleted = data.completedEntries.filter(data=>{
//           var filterVal = filterAr.includes(data.issueKey);
//           return filterVal;
//         });
//         var estimatedPoints = filterDataEstimated.reduce(function(sum,data) {
//           return sum + data.value;
//         }, 0);
//         var completedPoints = filterDataCompleted.reduce(function(sum,data) {
//           return sum + data.value;
//         }, 0);

//         var outData = {
//           estimatedStories: debuffData(filterDataEstimated),
//           completedStories: debuffData(filterDataCompleted),
//           estimatedPoints,
//           completedPoints
//         }
//         console.table(outData);
//       })
//       .catch(err=>{
//         console.log(err);
//       })
//   })
//   .catch(err=>{
//     console.log(err);
//   })
