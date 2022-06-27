// Import the C++ addon as well as websocket and mail handler libraries.
//const engine = require('./build/Release/casparengine');
const WebSocket = require('ws');
const { clearInterval } = require('timers');
//Kunal: new requires (2) -constant thing
const fs = require('fs');

var nodemailer = require('nodemailer');

// Initialize the PCR engine and print some brief informational messages to the console.
//engine.initializePCR();
console.log("Welcome to CASPAR--C-based Analysis of Samples by PCR with Adaptive Routine.");
console.log("----------Runtime Status----------");
console.log("Server running.");

// Initialize the websocket server. Port doesn't matter as long as it matches on the website, 7071 is usually unoccupied.
const wss = new WebSocket.Server({ port: 7071});

// These are for handling the SetInterval functions.
let DataIntervId;
let PCRIntervId;

// Tracks whether or not the PCR is currently running a sample and should be updated accordingly.
var isRunning = false;
//Kunal: New Variables
var savedStartTime = "";
var savedProjName = "";
var savedOperator = "";
var savedExperimentName = "";
var savedConfig = "";
var savedComments = "";
var savedFileName = "";
var savedFinishTime = "";
var savedDefProj = "";
var savedDefOp = "";
var savedDefEm = "";
var lastRequest = "";

// WebSocket initialization upon client connection and declaration of events for handling WS messages from the client.
wss.on('connection', function connection(ws) {
//Kunal:
  var configstrings = "";

  let currentdata = fs.readFileSync('./configurations/configs.txt', 'utf8');
  var array = currentdata.toString().split("\n");

  for (i = 0; i<array.length; i++) {
      if (array[i].includes("cname: ")){
          configstrings = configstrings + ":;:;:" + (array[i].substring(array[i].lastIndexOf("cname: ") + 7)).trim();
      }
  }

  // Send a message to the client to confirm connection.
  //console.log(configstrings);

  let connect = {
      id: "connect",
      status: "Server connected.",
      //Kunal: more code!
      running: isRunning.toString(),
      starttime: savedStartTime,
      projectname: savedProjName,
      operatorname: savedOperator,
      experimentname: savedExperimentName,
      configname: savedConfig,
      configs: configstrings,
      comments: savedComments,
      filename: savedFileName,
      defproj: savedDefProj,
      defop: savedDefOp,
      defem: savedDefEm,
  }  ;
  ws.send(JSON.stringify(connect));

  console.log("Connected to client.");

  // Log that a client connected to the console.

  // Set up message handling.
  ws.on('message', function message(data){
      var msg = JSON.parse(data);
      // Switch off the ID blank of the message.
      switch(msg.id){
          case "start/stop":
              if(isRunning === false)
              {
                  // Start the PCR cycling if it's not.
                  // engine.start(function (){});
                  isRunning = true;
                  console.log('Ignition started.');
                  // Start the periodic cycling data send and PCR data check.
                  DataIntervId = setInterval(sendit, 300);
                  PCRIntervId = setInterval(sendPCR, 5000);
              }
              else
              {
                  // Stop the cycling if it's running.
                  // Turn off the data sends.
                  clearInterval(DataIntervId);
                  clearInterval(PCRIntervId);
                  // Tell the engine to turn off.
  //                engine.stop();
                  isRunning = false;
                  console.log('Cycling shutdown.');
              }
              break;
          //Kunal: removed case "filename", completely. replaced with case "startSave"
          case "startSave":
              savedStartTime = msg.startTime;
              savedProjName = msg.projectName;
              savedOperator = msg.operator;
              savedExperimentName = msg.experimentName;
              savedConfig = msg.config;
              savedComments = msg.comments;
              savedFileName = msg.filename;
              savedDefProj = msg.defproj;
              savedDefOp = msg.defop;
              savedDefEm = msg.defem;
              break;
          //Kunal: new case
          case "savefinish":
              savedComments = msg.comments;
              savedFinishTime = msg.finishtime;
              break;
          //Kunal:
          case "configrequest":
              if(lastRequest != msg.config){
                  var requestdata = "";
                  let alldata = fs.readFileSync('./configurations/configs.txt', 'utf8');
                  var dataarray = alldata.toString().split("\n");
                  for (i = 0; i<dataarray.length; i++) {
                      if (dataarray[i].includes("cname: " + msg.config)){
                          requestdata = dataarray[i+1] + ":;:;:" + dataarray[i+2] + ":;:;:" + dataarray[i+3];
                      }
                  }
                  //console.log(requestdata);

                  var configloader = {
                      id: "loadconfig",
                      data: requestdata,
                  }
                  ws.send(JSON.stringify(configloader));
              }
              else{}
              lastRequest = msg.config;
              break;
          //Kunal: new case: saveconfiguration
          case "saveconfiguration":
              let newConfig = "cname: " + msg.name + "\n" + "oname: " + msg.defaultoperator + "\n" + "ename: " + msg.defaultemail + "\n" + "pname: " + msg.defaultproject + "\n \n";
              fs.appendFile('./configurations/configs.txt', newConfig, (err) => {
                  if (err) {
                      console.error(err)
                      return
                  }
              })
              break;
          case "sendemail":
              // Retrieve filenames from engine, and send them to an email address.
              /*var filenames = engine.getfiles();
              var mailOptions = {
                  from: 'caspar@casparvu.com',
                  to: 'kick767@gmail.com',
                  subject: 'CASPAR files',
                  text: 'See attached for requested data.',
                  attachments: [
                      {
                          filename: 'runtimelog.txt',
                          path: filenames[0] // stream this file
                      },
                      {
                          filename: 'cyclelog.txt',
                          path: filenames[1] // stream this file
                      },
                      {
                          filename: 'pcrlog.txt',
                          path: filenames[2] // stream this file
                      },
                      {
                          filename: 'rawdata.bin',bv
                          path: filenames[3] // stream this file
                      },
                  ]
              };*/
              /*// Send the email and log info.
              transporter.sendMail(mailOptions, function(error, info){
                  if (error) {
                      console.log(error);
                  } else {
                      console.log('Email sent: ' + info.response);
                  }
              });*/
              console.log("Email triggered.");
              break;
          case "shutdown":
              // Turn off the engine if it's running.
              if(isRunning === true)
              {
                  //engine.stop();
              }
              isRunning = false;
              // Log that the server is turning off and tell the client as much.
              console.log("Server disconnected.");
              ws.send(JSON.stringify({id: "connect", status: "Server disconnected."}));
              //engine.boxfanoff();
              // Hard shutdown. There should be a better way.
              process.exit();
      }
      // Log request received.
      console.log('received: %s', data);
  });
})

function sendit()
{
  // Create a struct of thermal and fluoresence data and send them to the client(s).
  var cyclingdata = [0,1]; //engine.readdata();
  var datastruct = {
      id: "cycledata",
      fluor: cyclingdata[0],
      temp: cyclingdata[1],
      //Kunal:1
      running: isRunning.toString()
  };
  wss.clients.forEach(function dataupdate(ws) {ws.send(JSON.stringify(datastruct));});

}

function sendPCR()
{
  // Check if PCR values are available.
  var PCRinfo = [1,2,3];//engine.readPCR();
  // If there aren't any, readPCR() returns negative 1, thus:
  if(PCRinfo[0] > 0)
  {
      // If there are, we log we're sending PCR values to the client, and do so.
      console.log("Sending PCR.");
      var datastruct = {
          id: "PCRdata",
          fam: PCRinfo[0],
          hex: PCRinfo[1],
          cy5: PCRinfo[2],
          //Kunal:1
          running: isRunning.toString()
      };
      console.log(datastruct);
      wss.clients.forEach(function pcrupdate(ws) {ws.send(JSON.stringify(datastruct));});
  }
  else
  {
      // Do nothing
  }
}

// Initialize the transporter for email use.
var transporter = nodemailer.createTransport({
service: 'Outlook365',
auth: {
  user: 'caspar@casparvu.com',
  pass: 'thefriendlyghostinthemachine'
}
});
