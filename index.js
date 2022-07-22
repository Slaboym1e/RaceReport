const express = require('express');
const app = express();
const path = require('path');
const config = require('./config.js');
const fs = require('fs');
const docs = require('./docgen');
const moment = require('moment');
const fileupload = require('express-fileupload');


app.use(express.static('public'));
app.use(express.json());
app.use(fileupload());

app.get('/', (req, res)=>{
    return res.sendFile(path.join(__dirname+'/pages/index.html'));
})

app.post('/senddata', (req, res)=>{
    const csvupload = req.files.csvfile;
    csvupload.mv(`${__dirname}/uploads/test/${csvupload.name}`,(err)=>{
        if(err)
            res.statusCode(500).send(err);
    })
    const jsonupload = req.files.jsonfile;
    jsonupload.mv(`${__dirname}/uploads/test/${jsonupload.name}`,(err)=>{
        if(err)
            res.statusCode(500).send(err);
    })
    //req.body = {csvname: csvupload.name, jsonname: jsonupload.name};
    return res.redirect('/renderreports?csv='+csvupload.name+'&json='+jsonupload.name);

})

app.get('/renderreports',(req, res)=>{
    let data = fs.readFileSync(`${__dirname}/uploads/test/${req.query.csv}`,"utf-8");
    data = data.split("\n");
    for(let i=0; i < data.length; i++){
        data[i] = data[i].split(',');
    }
    //
    let pdata = JSON.parse(fs.readFileSync(`${__dirname}/uploads/test/${req.query.json}`));
    //создание файла pdf, который в конце отправляется в response
    const docm = new docs(res,data[0][0],data[1][0],data[2][0], '50');
    docm.addHeader('Классификация по количеству кругов', 'portrait');
    if (pdata.length < 1)
        return res.send('Failed');

    //Таблица кругов (1)
    let circuitList = pdata.sort(compare);
    let CircTbl = {
        x:15, //позиция X
        y:85, // позиция Y
        width: 825, //Ширина таблицы
        hide_header:false, //скрыть заголовки таблицы или нет
        step: 10, //шаг в пиксилях по вертикали между строками таблицы
        headers:[],  //массив заголовков для колонок {name: "name", size: 30, align:"center", bold:true(optional)}
        rows:[] //массив строк таблицы
    }
    let ci = 0;
    CircTbl.headers.push({name:"Запуск:", size: 40, align:'left'});
    while(circuitList[ci].lap_number == 0){
        let pilot = tagFinder(circuitList[ci].tag_id, data);
        pilot != -1 ? CircTbl.headers.push({name:data[pilot][1], size:18, align:"center"}): CircTbl.headers.push({name:'-', size:18, align:"center"});
        ci++;
    }
    let bo = [];
    let bl = circuitList[ci].lap_number;
    bo.push(`Круг ${bl}`);
    for(let i = ci; i < circuitList.length; i++){
        if(circuitList[i].lap_number == bl){
            let num = tagFinder(circuitList[i].tag_id,data);
            num != -1? bo.push(data[num][1]): bo.push('-');
            //bo.push(data[tagFinder(circuitList[i].tag_id,data)][1]);
        }
        else{
            CircTbl.rows.push(bo);
            bo = [];
            bl = circuitList[i].lap_number;
            bo.push(`Круг ${bl}`)
            let num = tagFinder(circuitList[i].tag_id,data);
            num != -1? bo.push(data[num][1]): bo.push('-');
        }
    }
    CircTbl.rows.push(bo);
    
    //сбор данных для таблицы 3
    let raceList = pdata.sort(RacersCompare);
    let RCT = {
        x: 30,
        y: 85,
        width: 550,
        height: 700,
        vstep: 20,
        hstep: 50,
        headers:[],
        racers:[]
    }
    let raceTable = [];
    if (raceList.length > 1){
        let base = raceList[0].tag_id;
        let rows = []
        let bo = []
        for (let i= 0; i < raceList.length; i++){
            if (raceList[i].tag_id == base)
            {
                bo.push(raceList[i]);
                let lapr = [TimeUnix(raceList[i].discovery_unix_time, 'HH:mm:ss'), raceList[i].lap_number, raceList[i].lap_postition, TimeUnix(raceList[i].lap_time,'mm:ss.SSS')];
                rows.push(lapr);
            }
            else
            {
                //создание и добавление объекта гонщика в массив
                let pilot = tagFinder(raceList[i-1].tag_id, data);
                if (pilot != -1){
                    raceList[i-1].pname = data[pilot][2];
                    raceList[i-1].pilot_number = data[pilot][1];
            //можно отдельно добавить проверку на наличие города
                }
                else{
                    raceList[i-1].pname = 'Без имени';
                    raceList[i-1].pilot_number = 0;
                }
                RCT.racers.push(
                    {
                        header:{num: raceList[i-1].pilot_number, rname: raceList[i-1].pname, pos: raceList[i-1].current_race_postition},
                        best_lap: raceList[i-1].best_lap_number,
                        rows: rows
                    })
                //
                let lapr = [TimeUnix(raceList[i].discovery_unix_time, 'HH:mm:ss'), raceList[i].lap_number, raceList[i].lap_postition, TimeUnix(raceList[i].lap_time,'mm:ss.SSS')];
                rows = [];
                rows.push(lapr);
                raceTable.push(bo);
                bo = [];
                bo.push(raceList[i]);
                base = raceList[i].tag_id;
            }
        }
        raceTable.push(bo);
        RCT.racers.sort((a,b)=>{
            if (a.header.pos < b.header.pos)
                return -1;
            if (a.header.pos > b.header.pos)
                return 1;
            return 0;
        })
        
    }
    //сбор данных для таблицы 2
    let circQuant = [];
    for (let i = 0; i < raceTable.length; i++){
        circQuant.push(raceTable[i][raceTable[i].length-1]);
    }
    circQuant = circQuant.sort(PostitionCompare);
    let baseLaps = circQuant[0].lap_number;
    //PDF Классификация по количеству кругов
    let secondReportArr = {
        x:10,
        y:85,
        width:575,
        hide_header: false,
        step: 10,
        headers:[
        {name:"Очки",size:30, align: "center", bold:true},
        {name:"Поз.",size:30, align: "center",bold:true},
        {name:"№",size:30, align:'left', bold:true},
        {name:"Пилот",size:150, align:'left', bold:true},
        {name:"Город",size:100, align:'left'},
        {name:"Круги",size:30, align: 'center', bold:true},
        {name:"Вр.полное",size:60, align: 'right', bold:true},
        {name:"От лидера",size:60, align: 'right'},
        {name:"От пред.",size:60, align: 'right'}
        ],
        rows:[]
    }

    for(let i=0;i<circQuant.length;i++){

        let pilot = tagFinder(circQuant[i].tag_id, data);
        if (pilot != -1){
            circQuant[i].tag_id = data[pilot][2];
            circQuant[i].pilot_number = data[pilot][1];
            circQuant[i].city = data[pilot][3];
        }
        else{
            circQuant[i].tag_id = 'Без имени';
            circQuant[i].pilot_number = 0;
            circQuant[i].city = ''
        }
        let row = ['0', circQuant[i].current_race_postition,circQuant[i].pilot_number,circQuant[i].tag_id,circQuant[i].city,circQuant[i].lap_number];
        //Полное время гонщика
        row.push(TimeUnix(circQuant[i].race_total_time, 'HH:mm:ss.SSS',true))
        //Отставание от лидера
        if (circQuant[i].lap_number < baseLaps)
            row.push(((baseLaps-circQuant[i].lap_number)+' Кр.'));
        else if (circQuant[i].time_behind_the_leader == 0)
            row.push('-');
        else
            row.push(TimeUnix(circQuant[i].time_behind_the_leader, 'mm:ss.SSS'))
        //Отставание от предыдущего гонщика
        if (i==0)
            row.push("-");
        else if(i>0){
            if (circQuant[i].lap_number == circQuant[i-1].lap_number)
                row.push(TimeUnix(circQuant[i].race_total_time - circQuant[i-1].race_total_time,'mm:ss.SSS'));
            else if(circQuant[i].lap_number < circQuant[i-1].lap_number)
                row.push(((circQuant[i-1].lap_number - circQuant[i].lap_number) + ' Кр.'));
        }
        secondReportArr.rows.push(row);
    }
    docm.table(secondReportArr);
    docm.DaddPage('Таблица кругов','landskape');
    docm.table(CircTbl);
    docm.DaddPage('Покруговка','portrait');
    docm.TimeTable(RCT);
    docm.end();
    fs.unlinkSync(`${__dirname}/uploads/test/${req.query.csv}`);
    fs.unlinkSync(`${__dirname}/uploads/test/${req.query.json}`);
})

const tagFinder = (tag, data)=> {
    for(let i = 0; i < data.length; i++){
        if(data[i][0] === tag)
            return i;
    }
    return -1;
}



//Преобразует время в миллисекундах в строку по фармату
const TimeUnix = (ms_time, dformat, utc = false) => {
    if (ms_time == 0)
        return '-';
    let Time = new Date(ms_time);
    if (utc){
        Time.setHours(Time.getHours()-config.TIME_ZONE);
        return moment(Time).format(dformat);
    }
    return moment(Time).format(dformat);
}

//функция сравнения элементов по количеству пройденных кругов
const compare = (a,b) =>{
    if (a.lap_number < b.lap_number)
        return -1;
    if (a.lap_number > b.lap_number)
        return 1;
    return 0;
}


//функция сравнения по идентификатору пилота
const RacersCompare = (a,b) =>{
    if (a.tag_id < b.tag_id)
        return -1;
    if (a.tag_id > b.tag_id)
        return 1;
    return 0;
}

const PostitionCompare = (a,b) =>{
    if (a.current_race_postition < b.current_race_postition)
        return -1;
    if (a.current_race_postition > b.current_race_postition)
        return 1;
    return 0;
}

app.listen(config.PORT, ()=>{
    console.log(`App running at http://localhost:${config.PORT}`);
})