var AWS =require('aws-sdk');

exports.handler = (event,context) => {
AWS.config.update({
   accessKeyId: '',
   secretAccessKey: '',
   region: '',
});

var data = JSON.stringify(event);
console.log("data is"+ data);
console.log("message is"+event.Records[0].Sns.Message );
var tempMessage  =  event.Records[0].Sns.Message;
console.log(tempMessage.ClusterName);
var testMessage = JSON.stringify(tempMessage);
console.log(testMessage.ClusterName);
var message = JSON.parse(tempMessage);
console.log(message.ClusterName);





var taskArn;
var ecs = new AWS.ECS();
var ec2 = new AWS.EC2();
var route53 = new AWS.Route53();
var paramsForListTask = {
   cluster: message.ClusterName
};
var paramsForDescribeTask;
var paramsForGetPublicIp;
var eniId; var publicIp; var hostedZoneId; var publicIpRoute53;

var paramsForListHostedZones = {

};

var paramsForListRecordSet;
var paramsForUpdateRecord;







//Function for finding the Task Id of the AWS Fargate Task Instance
function findTaskId(callback, callback2, callback3, callback4, callback5) {
   ecs.listTasks(paramsForListTask, function (err, data) {

      if (err) console.log(err, err.stack); // an error occurred
      console.log(data.taskArns[0]); // successful response
      taskArn = data.taskArns[0];
      paramsForDescribeTask = {
         cluster: message.ClusterName,
         tasks: [taskArn]

      }
      callback();

   });
}





//Function for finding the ENI Id of the AWS Fargate Task Instance
function findEniId() {
   ecs.describeTasks(paramsForDescribeTask, function (err, data) {
      if (err) console.log(err, err.stack); // an error occurred
      console.log(data.tasks[0].attachments[0].details[1].value);           // successful response
      eniId = data.tasks[0].attachments[0].details[1].value;
      paramsForGetPublicIp = {
         NetworkInterfaceIds: [
            eniId
         ]

      }
      findPublicIp();

   });
}


// Function for finding the Public Ip of the AWS Fargate Task Instance
function findPublicIp() {
   ec2.describeNetworkInterfaces(paramsForGetPublicIp, function (err, data) {
      if (err) console.log(err, err.stack); // an error occurred

      console.log(data.NetworkInterfaces[0].Association.PublicIp);           // successful response
      publicIp = data.NetworkInterfaces[0].Association.PublicIp;
      findHostedZoneId();
   });

}


// Function for finding the Hosted Zone Id
function findHostedZoneId() {
   console.log()
   route53.listHostedZones(paramsForListHostedZones, function (err, data) {
      if (err) console.log(err, err.stack); // an error occurred
      else {
         hostedZoneId = data.HostedZones[1].Id;

         paramsForListRecordSet = {
            HostedZoneId: hostedZoneId, /* required */
         };
         findPublicIpRoute53();
      }

   });
}


// Function for finding the Public Ip stored in Route 53 Record
function findPublicIpRoute53() {
   route53.listResourceRecordSets(paramsForListRecordSet, function (err, data) {
      if (err) console.log(err, err.stack); // an error occurred
      else {
         for (var i = 0; i < data.ResourceRecordSets.length; i++) {

            if (data.ResourceRecordSets[i].Name.toString().trim() === message.RecordName) publicIpRoute53 = data.ResourceRecordSets[i].ResourceRecords[0].Value;

         }
         paramsForUpdateRecord = {
            ChangeBatch: {
               Changes: [
                  {
                     Action: "UPSERT",
                     ResourceRecordSet: {
                        Name: message.RecordName,
                        ResourceRecords: [
                           {
                              Value: publicIp
                           }
                        ],
                        TTL: 300,
                        Type: "A"
                     }
                  }
               ],
               Comment: "Updated"
            },
            HostedZoneId: hostedZoneId
         };
         updateRecordDetails();
      }
   });
}




// Function for comparing the public Ips from both the ends and updating the record as per need.
function updateRecordDetails() {
   console.log("publicIp from Route53 " + publicIpRoute53);
   console.log("publicIp from task instance " + publicIp);
   if (publicIpRoute53 != publicIp) {
      route53.changeResourceRecordSets(paramsForUpdateRecord, function (err, data) {

         console.log("Inside Update Record");
         if (err) console.log(err, err.stack); // an error occurred
         else console.log(data);           // successful response

      });
   }
}




findTaskId(findEniId, findPublicIp, findHostedZoneId, findPublicIpRoute53, updateRecordDetails);


};
