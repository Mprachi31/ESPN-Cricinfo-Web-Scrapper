//the purpose of this project is to extract info of worldcup 2019 from cricinfo and present 
//that in the form of excel and pdf scorecards
//the real purpose is to learn how to extract info and get experience with js
//A very good reason to ever make a project is to have good fun

//npm init -y
//npm install minimist
//npm install axios
//npm install jsdom
//npm install excel4node
//npm install pdf-lib

//node cricinfoextracter.js --source=https://www.espncricinfo.com/series/icc-cricket-world-cup-2019-1144415/match-results --excel=Worldcup.csv --dataFolder=data

let minimist=require("minimist");
let axios=require("axios");
let fs=require("fs");
let jsdom=require("jsdom");
let excel4node=require("excel4node");
let pdf=require("pdf-lib");
let path=require("path");
let args=minimist(process.argv);
//console.log(args.source);
//console.log(args.excel);
//console.log(args.dataFolder);
//download using axios
//read using jsdom
//make excel using excel4node
//make pdf using pdf-lib
let responsekapromise= axios.get(args.source);
responsekapromise.then(function(response){
    let html = response.data;
    //console.log(html);
    let dom = new jsdom.JSDOM(html);
    let document = dom.window.document;

    let matches = [];
    let matcheScoreDivs =document.querySelectorAll("div.ds-px-4.ds-py-3");
    //console.log(matcheScoreDivs.length);
    for(let i=0 ; i < matcheScoreDivs.length ; i++){
        let match = {
        };
        let namePs = matcheScoreDivs[i].querySelectorAll("p.ds-text-tight-m.ds-font-bold.ds-capitalize");
        match.t1 = namePs[0].textContent;
        match.t2 = namePs[1].textContent;

        let scoreSpan = matcheScoreDivs[i].querySelectorAll("div.ds-text-compact-s.ds-text-typo-title > strong");
        // match.t1 = scoreSpan[0].textContent;
        // match.t2 = scoreSpan[1].textContent;
        
        if(scoreSpan.length == 2){
            match.t1s = scoreSpan[0].textContent;
            match.t2s = scoreSpan[1].textContent;
        }else if(scoreSpan.length == 1){
            match.t1s = scoreSpan[0].textContent;
            match.t2s = "";
        }else{
            match.t1s = "";
            match.t2s = "";

        }
        let resultDiv = matcheScoreDivs[i].querySelectorAll("p.ds-text-tight-s.ds-font-regular.ds-truncate.ds-text-typo-title");
        match.result = resultDiv[0].textContent;
        matches.push(match);

    }
    //console.log(matches);
    let matcheskaJSON=JSON.stringify(matches);
    fs.writeFileSync("matches.json", matcheskaJSON,"utf-8");

    let teams=[];
    for(let i=0; i<matches.length ; i++){
        pushTeaminTeamIfnotAlreadyThere(teams,matches[i].t1);
        pushTeaminTeamIfnotAlreadyThere(teams,matches[i].t2);
    }

    for(let i=0; i<matches.length ; i++){
        pushMatvhinAppropriateTeam(teams,matches[i].t1,matches[i].t2,matches[i].t1s,matches[i].t2s,matches[i].result);
        pushMatvhinAppropriateTeam(teams,matches[i].t2,matches[i].t1,matches[i].t2s,matches[i].t1s,matches[i].result);
    }
    let teamskaJSON=JSON.stringify(teams);
    fs.writeFileSync("teams.json",teamskaJSON,"utf-8");

    createexcelfile(teams);

    createfolder(teams);
    

    

})

function createfolder(teams){
    fs.mkdirSync(args.dataFolder);

    for(let i=0 ; i<teams.length ;i++){
    let folderName=path.join(args.dataFolder,teams[i].name);
    fs.mkdirSync(folderName);

      for(let j=0 ; j < teams[i].matches.length ; j++){
        
        let matchfilename=path.join(folderName,teams[i].matches[j].vs+".pdf");
         createScoreCard(teams[i].name,teams[i].matches[j],matchfilename);
      }
    }
}

function createScoreCard(teamName,match,matchFileName){
    //this fn creates pdf for match in appropriate folder with correct details
    //here we will use pdf-lib to create the pdf
    let t1=teamName;
    let t2=match.vs;
    let t1s=match.selfscore;
    let t2s=match.oppscore;
    let result=match.result;

    let orignalBytes=fs.readFileSync("TEMPLATE.pdf");
    let prmToloaddoc=pdf.PDFDocument.load(orignalBytes);
    prmToloaddoc.then(function(pdfdoc){
        let page=pdfdoc.getPage(0);
        page.drawText(t1,{
            x:335,
            y:340
        });
        page.drawText(t2,{
            x:335,
            y:315
        });
        page.drawText(t1s,{
            x:335,
            y:290
        });
        page.drawText(t2s,{
            x:335,
            y:265
        });
        page.drawText(result,{
            x:335,
            y:245
        });
    
        let prmTosave=pdfdoc.save();
        prmTosave.then(function(changedBytes){
            fs.writeFileSync(matchFileName, changedBytes);
        });
    })
}

function createexcelfile(teams){
    let wb= new excel4node.Workbook();

    for(let i=0; i<teams.length ; i++){
        let sheet = wb.addWorksheet(teams[i].name);

        sheet.cell(1,1).string("oppteam");
        sheet.cell(1,2).string("homescore");
        sheet.cell(1,3).string("oppscore");
        sheet.cell(1,4).string("result");
        for(let j=0 ;j<teams[i].matches.length;j++){
            sheet.cell(2+j,1).string(teams[i].matches[j].vs);
            sheet.cell(2+j,2).string(teams[i].matches[j].selfscore);
            sheet.cell(2+j,3).string(teams[i].matches[j].oppscore);
            sheet.cell(2+j,4).string(teams[i].matches[j].result);
        }
    }
    wb.write(args.excel);
}

function pushMatvhinAppropriateTeam(teams,hometeam,oppteam,homescore,oppscore,result){
    let tidx=-1;
    for(let j=0;j<teams.length;j++){
        if(teams[j].name == hometeam){
            tidx = j;
            break;
        }
    }

    let team =teams[tidx];
    team.matches.push({
        vs: oppteam,
        selfscore: homescore,
        oppscore: oppscore,
        result: result
    });
}

function pushTeaminTeamIfnotAlreadyThere(teams, teamName){
     let t1idx=-1;
         for(let j=0;j<teams.length;j++){
             if(teams[j].name == teamName){
                 t1idx=j;
                }
            }

         if(t1idx ==-1){
             let team ={
                 name: teamName,
                 matches:[]
                }
                teams.push(team);
            }
            
}